package plugin

import (
	"encoding/json"
	"fmt"
	_ "github.com/lib/pq"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type document struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type documentMove struct {
	Name   string `json:"name"`
	Folder string `json:"folder"`
}

func safeDocumentPath(root, name string) (string, error) {
	cleanName := filepath.Clean(name)
	if cleanName == "." || cleanName == ".." || filepath.IsAbs(cleanName) || cleanName != name || !strings.HasSuffix(cleanName, ".md") {
		return "", fmt.Errorf("invalid document name")
	}
	path := filepath.Join(root, cleanName)
	if filepath.Dir(path) != root && !strings.HasPrefix(path, root+string(filepath.Separator)) {
		return "", fmt.Errorf("invalid document path")
	}
	return path, nil
}

func safeFolderPath(root, folder string) (string, error) {
	if folder == "" {
		return root, nil
	}
	cleanFolder := filepath.Clean(folder)
	if cleanFolder == "." || cleanFolder == ".." || filepath.IsAbs(cleanFolder) || cleanFolder != folder {
		return "", fmt.Errorf("invalid folder name")
	}
	path := filepath.Join(root, cleanFolder)
	if !strings.HasPrefix(path, root+string(filepath.Separator)) {
		return "", fmt.Errorf("invalid folder path")
	}
	return path, nil
}

func (a *App) handleDocs(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path == "/docs/folders" {
		if req.Method == http.MethodGet {
			folders := make([]string, 0)
			err := filepath.WalkDir(a.docsDir, func(path string, entry os.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if entry.IsDir() && path != a.docsDir {
					relative, relErr := filepath.Rel(a.docsDir, path)
					if relErr != nil {
						return relErr
					}
					folders = append(folders, filepath.ToSlash(relative))
				}
				return nil
			})
			if err != nil {
				http.Error(w, "failed to list folders: "+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(folders)
			return
		}
		if req.Method == http.MethodPost {
			var body struct {
				Folder string `json:"folder"`
			}
			if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
				http.Error(w, "invalid folder body", http.StatusBadRequest)
				return
			}
			folder, err := safeFolderPath(a.docsDir, body.Folder)
			if err != nil || body.Folder == "" {
				http.Error(w, "invalid folder name", http.StatusBadRequest)
				return
			}
			if err := os.MkdirAll(folder, 0o750); err != nil {
				http.Error(w, "failed to create folder: "+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"folder": body.Folder})
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if req.URL.Path == "/docs/move" && req.Method == http.MethodPost {
		var body documentMove
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			http.Error(w, "invalid move body", http.StatusBadRequest)
			return
		}
		source, err := safeDocumentPath(a.docsDir, body.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		destinationFolder, err := safeFolderPath(a.docsDir, body.Folder)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := os.MkdirAll(destinationFolder, 0o750); err != nil {
			http.Error(w, "failed to prepare folder: "+err.Error(), http.StatusInternalServerError)
			return
		}
		destination := filepath.Join(destinationFolder, filepath.Base(body.Name))
		if err := os.Rename(source, destination); err != nil {
			http.Error(w, "failed to move document: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(body)
		return
	}

	if req.Method == http.MethodGet && req.URL.Path == "/docs" {
		folder := req.URL.Query().Get("folder")
		docsPath, err := safeFolderPath(a.docsDir, folder)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		entries, err := os.ReadDir(docsPath)
		if err != nil {
			http.Error(w, "failed to list documents: "+err.Error(), http.StatusInternalServerError)
			return
		}
		names := make([]string, 0, len(entries))
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
				names = append(names, entry.Name())
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(names)
		return
	}

	name := strings.TrimPrefix(req.URL.Path, "/docs/")
	path, err := safeDocumentPath(a.docsDir, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	switch req.Method {
	case http.MethodGet:
		content, err := os.ReadFile(path)
		if os.IsNotExist(err) {
			http.Error(w, "document not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "failed to read document: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(document{Name: name, Content: string(content)})
	case http.MethodPut:
		var body document
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			http.Error(w, "invalid document body: "+err.Error(), http.StatusBadRequest)
			return
		}
		if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
			http.Error(w, "failed to create document folder: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if err := os.WriteFile(path, []byte(body.Content), 0o640); err != nil {
			http.Error(w, "failed to save document: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(document{Name: name, Content: body.Content})
	case http.MethodDelete:
		if err := os.Remove(path); os.IsNotExist(err) {
			http.Error(w, "document not found", http.StatusNotFound)
			return
		} else if err != nil {
			http.Error(w, "failed to delete document: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"deleted": name})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (a *App) handlePing(w http.ResponseWriter, req *http.Request) {
	w.Header().Add("Content-Type", "application/json")
	if _, err := w.Write([]byte(`{"message": "ok"}`)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// handleEcho is an example HTTP POST resource that accepts a JSON with a "message" key and
// returns to the client whatever it is sent.
func (a *App) handleEcho(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Add("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(body); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
func (a *App) handleGetUsers(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	startStr := req.URL.Query().Get("start")
	pageStr := req.URL.Query().Get("page")
	limitStr := req.URL.Query().Get("limit")
	page := 1
	limit := 10

	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}
	offset := (page - 1) * limit
	// connect to the db
	db, err := ConnectToDB(a.settings)
	if err != nil {
		http.Error(w, "failed to connect to db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()
	rows, err := db.Query(`SELECT id, username, team, phonenumber
		 FROM public.users
		 WHERE username LIKE $3 || '%'
		 ORDER BY id
		 LIMIT $1 OFFSET $2`, limit, offset, startStr)
	if err != nil {
		http.Error(w, "failed to query db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type User struct {
		ID          int    `json:"id"`
		Username    string `json:"username"`
		Team        string `json:"team"`
		Phonenumber string `json:"phonenumber"`
	}

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Team, &u.Phonenumber); err != nil {
			http.Error(w, "failed to scan row: "+err.Error(), http.StatusInternalServerError)
			return
		}
		users = append(users, u)
	}
	var total int
	err = db.QueryRow("SELECT COUNT(*) FROM public.users WHERE username LIKE $1 || '%'", startStr).Scan(&total)
	if err != nil {
		http.Error(w, "failed to count users: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Response with metadata
	response := map[string]interface{}{
		"data":       users,
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	}

	// ✅ Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "failed to encode response: "+err.Error(), http.StatusInternalServerError)
		return
	}
}
func (a *App) handleDeleteUser(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := strings.TrimPrefix(req.URL.Path, "/delete/user/")
	if idStr == "" {
		http.Error(w, "missing user id", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}
	// connect to DB
	db, err := ConnectToDB(a.settings)
	if err != nil {
		http.Error(w, "failed to connect to db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()
	// run delete query
	res, err := db.Exec("DELETE FROM public.users WHERE id = $1", id)
	if err != nil {
		http.Error(w, "failed to delete user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "no user found with given id", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf(`{"deleted": %d}`, id)))

}

func (a *App) handleAddUser(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse JSON body
	var body struct {
		Username    string `json:"username"`
		Team        string `json:"team"`
		Phonenumber string `json:"phonenumber"`
	}

	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}
	if len(body.Phonenumber) != 10 || !isDigits(body.Phonenumber) {
		msg := fmt.Sprintf("phone number invalid")
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	if looksLikeSQLInjection(body.Team) || looksLikeSQLInjection(body.Phonenumber) || looksLikeSQLInjection(body.Username) {
		http.Error(w, "sql injection", http.StatusBadRequest)
		return
	}
	// connect to DB
	db, err := ConnectToDB(a.settings)
	if err != nil {
		http.Error(w, "failed to connect to db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()
	// Insert new user
	var newID int
	query := `INSERT INTO public.users (username, team, phonenumber) 
              VALUES ($1, $2, $3) RETURNING id`
	err = db.QueryRow(query, body.Username, body.Team, body.Phonenumber).Scan(&newID)
	if err != nil {
		http.Error(w, "failed to insert user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Respond with the new user JSON
	user := map[string]any{
		"id":          newID,
		"username":    body.Username,
		"team":        body.Team,
		"phonenumber": body.Phonenumber,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (a *App) handleUpdateUser(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := strconv.Atoi(strings.TrimPrefix(req.URL.Path, "/user/"))
	if err != nil || id <= 0 {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}
	var body struct {
		Username    string `json:"username"`
		Team        string `json:"team"`
		Phonenumber string `json:"phonenumber"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}
	if body.Username == "" || body.Team == "" || len(body.Phonenumber) != 10 || !isDigits(body.Phonenumber) {
		http.Error(w, "invalid user data", http.StatusBadRequest)
		return
	}
	if looksLikeSQLInjection(body.Team) || looksLikeSQLInjection(body.Phonenumber) || looksLikeSQLInjection(body.Username) {
		http.Error(w, "sql injection", http.StatusBadRequest)
		return
	}

	db, err := ConnectToDB(a.settings)
	if err != nil {
		http.Error(w, "failed to connect to db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()
	result, err := db.Exec("UPDATE public.users SET username = $1, team = $2, phonenumber = $3 WHERE id = $4", body.Username, body.Team, body.Phonenumber, id)
	if err != nil {
		http.Error(w, "failed to update user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "no user found with given id", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"id": id, "username": body.Username, "team": body.Team, "phonenumber": body.Phonenumber})
}

// registerRoutes takes a *http.ServeMux and registers some HTTP handlers.
func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/ping", a.handlePing)
	mux.HandleFunc("/echo", a.handleEcho)
	mux.HandleFunc("/users", a.handleGetUsers)
	mux.HandleFunc("/delete/user/", a.handleDeleteUser)
	mux.HandleFunc("/user", a.handleAddUser)
	mux.HandleFunc("/user/", a.handleUpdateUser)
	mux.HandleFunc("/docs", a.handleDocs)
	mux.HandleFunc("/docs/", a.handleDocs)
}
