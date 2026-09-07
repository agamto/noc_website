package plugin

import (
	"encoding/json"
	"fmt"
	"database/sql"
	"net"
	"net/url"
	"regexp"
	"strconv"
	_ "github.com/lib/pq"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)
func ExtractSettings(settings backend.AppInstanceSettings) (host, user, dbname string, port int, password string, err error) {
    // 1. Unmarshal JSONData into a map
    var data map[string]any
    if err := json.Unmarshal(settings.JSONData, &data); err != nil {
        return "", "", "", 0, "", fmt.Errorf("failed to parse JSONData: %w", err)
    }
	
	host, _ = data["host"].(string)

	port = 0
	if p, ok := data["port"].(float64); ok { // JSON numbers become float64
	    port = int(p)
	}

	user, _ = data["user"].(string)
	dbname, _ = data["dbname"].(string)

    // 3. Extract password from secure JSON data
    if val, ok := settings.DecryptedSecureJSONData["password"]; ok {
        password = val
    }

    return host, user, dbname, port, password, nil
}
var sqliPattern = regexp.MustCompile(`(?i)(\b(select|union|insert|update|delete|drop|truncate|alter|--|;|/\*|\*/|' or '|or 1=1|exec|xp_)\b)`)

func looksLikeSQLInjection(s string) bool {
    if s == "" {
        return false
    }
    // short circuit—long strings are suspicious too
    if len(s) > 500 {
        return true
    }
    return sqliPattern.MatchString(s)
}
func ConnectToDB(settings backend.AppInstanceSettings) (*sql.DB, error) {
	// 1. Extract non-secret values from jsonData
	host, user, dbname, port, password, err := ExtractSettings(settings)
	if err != nil {
		return nil, err
	}

	// A URL safely encodes credentials that contain spaces, quotes, or equals signs.
	dsn := (&url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, password),
		Host:     net.JoinHostPort(host, strconv.Itoa(port)),
		Path:     dbname,
		RawQuery: "sslmode=disable",
	}).String()
	// 4. Open DB connection
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to db: %w", err)
	}

	// Optional: ping to verify
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("db ping failed: %w", err)
	}

	return db, nil
}
func isDigits(s string) bool {
    for _, c := range s {
        if c < '0' || c > '9' {
            return false
        }
    }
    return true
}