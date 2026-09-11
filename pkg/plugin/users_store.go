package plugin

import "database/sql"

// ensureUsersSchema creates the users table if it doesn't already exist. It is cheap to call on
// every request thanks to IF NOT EXISTS, and avoids requiring a separate migration step.
func ensureUsersSchema(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS public.users (
		id SERIAL PRIMARY KEY,
		username TEXT NOT NULL,
		team TEXT NOT NULL,
		phonenumber TEXT NOT NULL
	)`)
	return err
}
