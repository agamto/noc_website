package plugin

import (
	"database/sql"
	"time"
)

// ChatSession is one saved conversation, scoped to the Grafana user who created it.
type ChatSession struct {
	ID        int64     `json:"id"`
	UserLogin string    `json:"-"`
	Title     string    `json:"title"`
	ModelID   string    `json:"modelId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ChatMessage is a single turn (user prompt or assistant reply) within a ChatSession.
type ChatMessage struct {
	ID        int64     `json:"id"`
	SessionID int64     `json:"sessionId"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

// ensureChatSchema creates the chat tables if they don't already exist. It is cheap to call on
// every request thanks to IF NOT EXISTS, and avoids requiring a separate migration step.
func ensureChatSchema(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS public.chat_sessions (
			id SERIAL PRIMARY KEY,
			user_login TEXT NOT NULL,
			title TEXT NOT NULL,
			model_id TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS chat_sessions_user_login_idx ON public.chat_sessions (user_login, updated_at DESC)`,
		`CREATE TABLE IF NOT EXISTS public.chat_messages (
			id SERIAL PRIMARY KEY,
			session_id INTEGER NOT NULL REFERENCES public.chat_sessions (id) ON DELETE CASCADE,
			role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
			content TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON public.chat_messages (session_id, id)`,
	}
	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return err
		}
	}
	return nil
}

func listChatSessions(db *sql.DB, userLogin string) ([]ChatSession, error) {
	rows, err := db.Query(`SELECT id, title, model_id, created_at, updated_at
		FROM public.chat_sessions
		WHERE user_login = $1
		ORDER BY updated_at DESC`, userLogin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := make([]ChatSession, 0)
	for rows.Next() {
		var session ChatSession
		if err := rows.Scan(&session.ID, &session.Title, &session.ModelID, &session.CreatedAt, &session.UpdatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}

func createChatSession(db *sql.DB, userLogin, title, modelID string) (ChatSession, error) {
	session := ChatSession{UserLogin: userLogin, Title: title, ModelID: modelID}
	err := db.QueryRow(`INSERT INTO public.chat_sessions (user_login, title, model_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`, userLogin, title, modelID,
	).Scan(&session.ID, &session.CreatedAt, &session.UpdatedAt)
	return session, err
}

// getChatSession returns sql.ErrNoRows if the session doesn't exist or doesn't belong to userLogin.
func getChatSession(db *sql.DB, id int64, userLogin string) (ChatSession, error) {
	var session ChatSession
	err := db.QueryRow(`SELECT id, title, model_id, created_at, updated_at
		FROM public.chat_sessions
		WHERE id = $1 AND user_login = $2`, id, userLogin,
	).Scan(&session.ID, &session.Title, &session.ModelID, &session.CreatedAt, &session.UpdatedAt)
	return session, err
}

func deleteChatSession(db *sql.DB, id int64, userLogin string) (int64, error) {
	result, err := db.Exec(`DELETE FROM public.chat_sessions WHERE id = $1 AND user_login = $2`, id, userLogin)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func touchChatSession(db *sql.DB, id int64) error {
	_, err := db.Exec(`UPDATE public.chat_sessions SET updated_at = now() WHERE id = $1`, id)
	return err
}

func listChatMessages(db *sql.DB, sessionID int64) ([]ChatMessage, error) {
	rows, err := db.Query(`SELECT id, session_id, role, content, created_at
		FROM public.chat_messages
		WHERE session_id = $1
		ORDER BY id ASC`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]ChatMessage, 0)
	for rows.Next() {
		var message ChatMessage
		if err := rows.Scan(&message.ID, &message.SessionID, &message.Role, &message.Content, &message.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}
	return messages, rows.Err()
}

func insertChatMessage(db *sql.DB, sessionID int64, role, content string) (ChatMessage, error) {
	message := ChatMessage{SessionID: sessionID, Role: role, Content: content}
	err := db.QueryRow(`INSERT INTO public.chat_messages (session_id, role, content)
		VALUES ($1, $2, $3)
		RETURNING id, created_at`, sessionID, role, content,
	).Scan(&message.ID, &message.CreatedAt)
	return message, err
}
