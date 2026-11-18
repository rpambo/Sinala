package api

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

type Config struct {
	WebOrigin    string
	CookieSecure bool
	SessionTTL   time.Duration
	TrustProxy   bool
}

type Server struct {
	db             *pgxpool.Pool
	config         Config
	rateLimitMu    sync.Mutex
	authRateLimits map[string][]time.Time
}

type user struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type contextKey string

const userContextKey contextKey = "authenticated-user"

func New(pool *pgxpool.Pool, config Config) http.Handler {
	server := &Server{db: pool, config: config, authRateLimits: make(map[string][]time.Time)}
	router := chi.NewRouter()
	router.Use(securityHeaders)
	router.Use(server.originGuard)

	router.Get("/api/health", server.health)
	router.Get("/api/openapi.yaml", serveOpenAPISpec)
	router.Get("/swagger/*", httpSwagger.Handler(httpSwagger.URL("/api/openapi.yaml")))
	router.Get("/api/auth/session", server.session)
	router.With(server.rateLimit(10, time.Minute)).Post("/api/auth/login", server.login)
	router.With(server.rateLimit(5, time.Minute)).Post("/api/auth/register", server.register)
	router.Post("/api/auth/logout", server.logout)
	router.With(server.rateLimit(5, time.Minute)).Post("/api/auth/recovery", server.recovery)
	router.Get("/api/incidents", server.listPublicIncidents)
	router.Post("/api/incidents", server.createIncident)
	router.Get("/api/incidents/{reference}", server.getIncident)
	router.With(server.requireUser).Get("/api/account/incidents", server.listAccountIncidents)
	router.Group(func(admin chi.Router) {
		admin.Use(server.requireAdmin)
		admin.Get("/api/admin/incidents", server.listAdminIncidents)
		admin.Patch("/api/admin/incidents/{reference}/status", server.updateStatus)
		admin.Get("/api/admin/incidents/{reference}/attachment", server.downloadAttachment)
	})
	return router
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.db.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "A base de dados está indisponível.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}
