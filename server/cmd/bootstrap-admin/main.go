package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"sinala/server/internal/config"
	"sinala/server/internal/database"
)

func main() {
	if err := config.LoadEnvironment(); err != nil {
		log.Fatal(err)
	}
	databaseURL := os.Getenv("DATABASE_URL")
	email := strings.ToLower(strings.TrimSpace(os.Getenv("SINALA_ADMIN_EMAIL")))
	password := os.Getenv("SINALA_ADMIN_PASSWORD")
	name := strings.TrimSpace(os.Getenv("SINALA_ADMIN_NAME"))
	if databaseURL == "" || email == "" || len(password) < 12 {
		log.Fatal("Set DATABASE_URL, SINALA_ADMIN_EMAIL, and SINALA_ADMIN_PASSWORD (at least 12 characters).")
	}
	if name == "" {
		name = "Administrador SINALA"
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	pool, err := database.Open(ctx, databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	_, err = pool.Exec(ctx,
		`INSERT INTO users (id, name, email, password_hash, role)
		 VALUES ($1, $2, $3, $4, 'ADMIN')
		 ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'ADMIN'`,
		uuid.New(), name, email, string(passwordHash),
	)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Admin account configured for %s.", email)
}
