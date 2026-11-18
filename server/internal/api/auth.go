package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

func (s *Server) originGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete:
			if r.Header.Get("Origin") != s.config.WebOrigin {
				writeError(w, http.StatusForbidden, "Origem do pedido não autorizada.")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) session(w http.ResponseWriter, r *http.Request) {
	current, ok, err := s.authenticate(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível verificar a sessão.")
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	writeJSON(w, http.StatusOK, current)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Pedido de autenticação inválido.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if _, err := mail.ParseAddress(email); err != nil || len(input.Password) < 8 || len(input.Password) > 128 {
		writeError(w, http.StatusUnauthorized, "Email ou palavra-passe inválidos.")
		return
	}

	var current user
	var passwordHash string
	err := s.db.QueryRow(r.Context(),
		`SELECT id::text, name, email, role, password_hash FROM users WHERE email = $1`,
		email,
	).Scan(&current.ID, &current.Name, &current.Email, &current.Role, &passwordHash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "Email ou palavra-passe inválidos.")
		return
	}
	if err := s.createSession(w, r, current.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível iniciar a sessão.")
		return
	}
	writeJSON(w, http.StatusOK, current)
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Dados de registo inválidos.")
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	if len(input.Name) < 2 || len(input.Name) > 100 || len(input.Password) < 8 || len(input.Password) > 128 {
		writeError(w, http.StatusBadRequest, "Verifique o nome e use uma palavra-passe entre 8 e 128 caracteres.")
		return
	}
	if _, err := mail.ParseAddress(input.Email); err != nil {
		writeError(w, http.StatusBadRequest, "Indique um email válido.")
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível criar a conta.")
		return
	}
	current := user{ID: uuid.NewString(), Name: input.Name, Email: input.Email, Role: "CITIZEN"}
	_, err = s.db.Exec(r.Context(),
		`INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'CITIZEN')`,
		current.ID, current.Name, current.Email, string(passwordHash),
	)
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "Já existe uma conta associada a este email.")
			return
		}
		writeError(w, http.StatusInternalServerError, "Não foi possível criar a conta.")
		return
	}
	if err := s.createSession(w, r, current.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "A conta foi criada, mas não foi possível iniciar a sessão.")
		return
	}
	writeJSON(w, http.StatusCreated, current)
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie("sinala_session"); err == nil {
		tokenHash := hashToken(cookie.Value)
		if _, err := s.db.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash = $1`, tokenHash); err != nil {
			writeError(w, http.StatusInternalServerError, "Não foi possível terminar a sessão.")
			return
		}
	}
	http.SetCookie(w, &http.Cookie{
		Name: "sinala_session", Value: "", Path: "/api", HttpOnly: true,
		Secure: s.config.CookieSecure, SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) recovery(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotImplemented, "A recuperação de palavra-passe requer a configuração de um serviço de email.")
}

func (s *Server) requireAdmin(next http.Handler) http.Handler {
	return s.requireUser(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current, ok := r.Context().Value(userContextKey).(user)
		if !ok || current.Role != "ADMIN" {
			writeError(w, http.StatusForbidden, "Acesso reservado à administração.")
			return
		}
		next.ServeHTTP(w, r)
	}))
}

func (s *Server) requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current, ok, err := s.authenticate(r.Context(), r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Não foi possível verificar a sessão.")
			return
		}
		if !ok {
			writeError(w, http.StatusUnauthorized, "Inicie sessão para continuar.")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, current)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) authenticate(ctx context.Context, r *http.Request) (user, bool, error) {
	cookie, err := r.Cookie("sinala_session")
	if err != nil || len(cookie.Value) != 64 {
		return user{}, false, nil
	}
	tokenHash := hashToken(cookie.Value)
	var current user
	err = s.db.QueryRow(ctx,
		`SELECT u.id::text, u.name, u.email, u.role
		 FROM sessions s JOIN users u ON u.id = s.user_id
		 WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
		tokenHash,
	).Scan(&current.ID, &current.Name, &current.Email, &current.Role)
	if err == pgx.ErrNoRows {
		return user{}, false, nil
	}
	return current, err == nil, err
}

func (s *Server) rateLimit(maximum int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				host = r.RemoteAddr
			}
			if s.config.TrustProxy {
				if forwardedIP := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Real-IP"))); forwardedIP != nil {
					host = forwardedIP.String()
				}
			}
			now := time.Now()
			s.rateLimitMu.Lock()
			attempts := s.authRateLimits[host]
			recent := attempts[:0]
			for _, attempt := range attempts {
				if now.Sub(attempt) < window {
					recent = append(recent, attempt)
				}
			}
			if len(recent) >= maximum {
				s.authRateLimits[host] = recent
				s.rateLimitMu.Unlock()
				writeError(w, http.StatusTooManyRequests, "Demasiados pedidos. Aguarde antes de tentar novamente.")
				return
			}
			s.authRateLimits[host] = append(recent, now)
			s.rateLimitMu.Unlock()
			next.ServeHTTP(w, r)
		})
	}
}

func (s *Server) createSession(w http.ResponseWriter, r *http.Request, userID string) error {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}
	token := hex.EncodeToString(tokenBytes)
	expiresAt := time.Now().Add(s.config.SessionTTL)
	if _, err := s.db.Exec(r.Context(),
		`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
		hashToken(token), userID, expiresAt,
	); err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name: "sinala_session", Value: token, Path: "/api", HttpOnly: true,
		Secure: s.config.CookieSecure, SameSite: http.SameSiteLaxMode,
		Expires: expiresAt, MaxAge: int(s.config.SessionTTL.Seconds()),
	})
	return nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
