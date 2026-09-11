package plugin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/bedrock"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/main/noc-app/pkg/plugin/auth"
)

const defaultBedrockModelID = "amazon.nova-2-lite-v1:0"

// currentUserLogin resolves the signed-in Grafana user for the request, which is how chat
// sessions are scoped: each user only ever sees and can act on their own sessions.
func currentUserLogin(req *http.Request) (string, error) {
	user := backend.PluginConfigFromContext(req.Context()).User
	if user == nil || user.Login == "" {
		return "", errors.New("no signed-in user for this request")
	}
	return user.Login, nil
}

// bedrockClients builds the Bedrock control-plane and runtime clients using the AWS credentials
// configured for this plugin instance (defaults to the compute's inherited IAM role).
func (a *App) bedrockClients(ctx context.Context) (*bedrock.Client, *bedrockruntime.Client, error) {
	authProvider, err := auth.NewAWSClientProvider(ctx, backend.DataSourceInstanceSettings{
		JSONData:                a.settings.JSONData,
		DecryptedSecureJSONData: a.settings.DecryptedSecureJSONData,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("load AWS auth settings: %w", err)
	}

	region := a.bedrockRegion
	if region == "" {
		region = os.Getenv("AWS_REGION")
	}
	awsConfig, err := authProvider.GetAWSConfig(ctx, region)
	if err != nil {
		return nil, nil, fmt.Errorf("load AWS configuration: %w", err)
	}

	return bedrock.NewFromConfig(awsConfig), bedrockruntime.NewFromConfig(awsConfig), nil
}

func (a *App) handleChatModels(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	controlClient, _, err := a.bedrockClients(req.Context())
	if err != nil {
		http.Error(w, "failed to configure Bedrock client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	models, err := listBedrockModels(req.Context(), controlClient)
	if err != nil {
		http.Error(w, "failed to list Bedrock models: "+err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"models":         models,
		"defaultModelId": defaultBedrockModelID,
	})
}

// handleChatSessions serves GET/POST /chat/sessions (list and create).
func (a *App) handleChatSessions(w http.ResponseWriter, req *http.Request) {
	userLogin, err := currentUserLogin(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	db, err := ConnectToDB(a.settings)
	if err != nil {
		http.Error(w, "failed to connect to db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()
	if err := ensureChatSchema(db); err != nil {
		http.Error(w, "failed to prepare chat storage: "+err.Error(), http.StatusInternalServerError)
		return
	}

	switch req.Method {
	case http.MethodGet:
		sessions, err := listChatSessions(db, userLogin)
		if err != nil {
			http.Error(w, "failed to list chat sessions: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(sessions)
	case http.MethodPost:
		var body struct {
			Title   string `json:"title"`
			ModelID string `json:"modelId"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			http.Error(w, "invalid session body: "+err.Error(), http.StatusBadRequest)
			return
		}
		if body.ModelID == "" {
			http.Error(w, "modelId is required", http.StatusBadRequest)
			return
		}
		title := strings.TrimSpace(body.Title)
		if title == "" {
			title = "New chat"
		}
		session, err := createChatSession(db, userLogin, title, body.ModelID)
		if err != nil {
			http.Error(w, "failed to create chat session: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(session)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleChatSessionDetail serves /chat/sessions/{id} (DELETE) and /chat/sessions/{id}/messages
// (GET/POST).
func (a *App) handleChatSessionDetail(w http.ResponseWriter, req *http.Request) {
	userLogin, err := currentUserLogin(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	rest := strings.TrimPrefix(req.URL.Path, "/chat/sessions/")
	sessionIDStr, sub, hasSub := strings.Cut(rest, "/")
	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil || sessionID <= 0 {
		http.Error(w, "invalid session id", http.StatusBadRequest)
		return
	}
	if hasSub && sub != "messages" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	db, err := ConnectToDB(a.settings)
	if err != nil {
		http.Error(w, "failed to connect to db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()
	if err := ensureChatSchema(db); err != nil {
		http.Error(w, "failed to prepare chat storage: "+err.Error(), http.StatusInternalServerError)
		return
	}

	session, err := getChatSession(db, sessionID, userLogin)
	if err != nil {
		http.Error(w, "chat session not found", http.StatusNotFound)
		return
	}

	if !hasSub {
		if req.Method != http.MethodDelete {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if _, err := deleteChatSession(db, sessionID, userLogin); err != nil {
			http.Error(w, "failed to delete chat session: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]int64{"deleted": sessionID})
		return
	}

	switch req.Method {
	case http.MethodGet:
		messages, err := listChatMessages(db, sessionID)
		if err != nil {
			http.Error(w, "failed to list chat messages: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(messages)
	case http.MethodPost:
		a.handlePostChatMessage(w, req, db, session)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (a *App) handlePostChatMessage(w http.ResponseWriter, req *http.Request, db *sql.DB, session ChatSession) {
	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "invalid message body: "+err.Error(), http.StatusBadRequest)
		return
	}
	content := strings.TrimSpace(body.Content)
	if content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}

	history, err := listChatMessages(db, session.ID)
	if err != nil {
		http.Error(w, "failed to load chat history: "+err.Error(), http.StatusInternalServerError)
		return
	}

	userMessage, err := insertChatMessage(db, session.ID, "user", content)
	if err != nil {
		http.Error(w, "failed to save message: "+err.Error(), http.StatusInternalServerError)
		return
	}

	_, runtimeClient, err := a.bedrockClients(req.Context())
	if err != nil {
		http.Error(w, "failed to configure Bedrock client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	reply, err := converseWithBedrock(req.Context(), runtimeClient, session.ModelID, history, content)
	if err != nil {
		http.Error(w, "failed to get a response from Bedrock: "+err.Error(), http.StatusBadGateway)
		return
	}

	assistantMessage, err := insertChatMessage(db, session.ID, "assistant", reply)
	if err != nil {
		http.Error(w, "failed to save assistant reply: "+err.Error(), http.StatusInternalServerError)
		return
	}
	_ = touchChatSession(db, session.ID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]ChatMessage{
		"userMessage":      userMessage,
		"assistantMessage": assistantMessage,
	})
}
