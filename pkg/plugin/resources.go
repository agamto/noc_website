package plugin

import (
	"encoding/json"
	"net/http"
	"math"
	"fmt"
	"strconv"
    "strings"
	_ "github.com/lib/pq"
)

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
		 LIMIT $1 OFFSET $2`, limit, offset,startStr)
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
		if err := rows.Scan(&u.ID, &u.Username,&u.Team,&u.Phonenumber); err != nil {
			http.Error(w, "failed to scan row: "+err.Error(), http.StatusInternalServerError)
			return
		}
		users = append(users, u)
	}
	var total int
	err = db.QueryRow("SELECT COUNT(*) FROM public.users WHERE username LIKE $1 || '%'",startStr).Scan(&total)
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
	if req.Method != http.MethodDelete  {
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
        "id":         newID,
        "username":   body.Username,
        "team":       body.Team,
        "phonenumber": body.Phonenumber,
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}
// registerRoutes takes a *http.ServeMux and registers some HTTP handlers.
func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/ping", a.handlePing)
	mux.HandleFunc("/echo", a.handleEcho)
	mux.HandleFunc("/users", a.handleGetUsers)
	mux.HandleFunc("/delete/user/", a.handleDeleteUser)
	mux.HandleFunc("/user",a.handleAddUser)
}
