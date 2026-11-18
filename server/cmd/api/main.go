package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"sinala/server/internal/api"
	"sinala/server/internal/config"
	"sinala/server/internal/database"
)

func main() {
	if err := config.LoadEnvironment(); err != nil {
		log.Fatal(err)
	}
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	pool, err := database.Open(ctx, databaseURL)
	cancel()
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	address := os.Getenv("API_ADDR")
	if address == "" {
		address = ":3000"
	}
	webOrigin := strings.TrimRight(os.Getenv("WEB_ORIGIN"), "/")
	if webOrigin == "" {
		webOrigin = "http://localhost:4200"
	}
	cookieSecure := strings.EqualFold(os.Getenv("COOKIE_SECURE"), "true")
	trustProxy := strings.EqualFold(os.Getenv("TRUST_PROXY"), "true")
	sessionTTL := 7 * 24 * time.Hour
	if value := os.Getenv("SESSION_TTL"); value != "" {
		sessionTTL, err = time.ParseDuration(value)
		if err != nil || sessionTTL < time.Hour || sessionTTL > 30*24*time.Hour {
			log.Fatal("SESSION_TTL must be between 1h and 720h")
		}
	}

	handler := api.New(pool, api.Config{
		WebOrigin:    webOrigin,
		CookieSecure: cookieSecure,
		SessionTTL:   sessionTTL,
		TrustProxy:   trustProxy,
	})
	server := &http.Server{
		Addr:              address,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("SINALA API listening on %s", address)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("API shutdown error: %v", err)
	}
}
