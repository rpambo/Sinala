package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"html"
	"log"
	"net"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

const (
	passwordMinBytes = 8
	passwordMaxBytes = 72
	tokenLength      = 64
)

var dummyPasswordHash = func() []byte {
	hash, err := bcrypt.GenerateFromPassword([]byte("sinala-dummy-password"), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	return hash
}()

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
	email, validEmail := normalizeEmail(input.Email)
	if !validEmail || !validPassword(input.Password) {
		writeError(w, http.StatusUnauthorized, "Email ou palavra-passe inválidos.")
		return
	}

	var current user
	var passwordHash string
	var verified bool
	err := s.db.QueryRow(r.Context(),
		`SELECT id::text, name, email, role, password_hash, email_verified_at IS NOT NULL
		 FROM users WHERE lower(email) = $1`,
		email,
	).Scan(&current.ID, &current.Name, &current.Email, &current.Role, &passwordHash, &verified)
	if err != nil {
		// Keep the response time comparable for unknown accounts.
		_ = bcrypt.CompareHashAndPassword(dummyPasswordHash, []byte(input.Password))
		writeError(w, http.StatusUnauthorized, "Email ou palavra-passe inválidos.")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "Email ou palavra-passe inválidos.")
		return
	}
	if !verified {
		writeCodeError(w, http.StatusForbidden, "EMAIL_NOT_VERIFIED", "Confirme o seu email antes de iniciar sessão.")
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
	name := strings.TrimSpace(input.Name)
	email, validEmail := normalizeEmail(input.Email)
	if len(name) < 2 || len(name) > 100 {
		writeError(w, http.StatusBadRequest, "Indique um nome entre 2 e 100 caracteres.")
		return
	}
	if !validEmail {
		writeError(w, http.StatusBadRequest, "Indique um email válido.")
		return
	}
	if !validPassword(input.Password) {
		writeError(w, http.StatusBadRequest, passwordPolicyMessage())
		return
	}
	if !s.config.Mail.Enabled() {
		writeError(w, http.StatusServiceUnavailable, "O registo requer um serviço de email configurado.")
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusBadRequest, passwordPolicyMessage())
		return
	}
	current := user{ID: uuid.NewString(), Name: name, Email: email, Role: "CITIZEN"}
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
	if err := s.issueVerificationToken(r.Context(), current); err != nil {
		log.Printf("SINALA verification email failed: %v", err)
		if _, cleanupErr := s.db.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, current.ID); cleanupErr != nil {
			log.Printf("SINALA verification rollback failed: %v", cleanupErr)
		}
		writeError(w, http.StatusBadGateway, "Não foi possível enviar o email de verificação. Tente novamente.")
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{
		"message": "Enviámos um email de verificação. Confirme o seu endereço antes de entrar.",
		"email":   current.Email,
	})
}

func (s *Server) verifyEmail(w http.ResponseWriter, r *http.Request) {
	token, ok := decodeTokenBody(w, r)
	if !ok {
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível verificar o email.")
		return
	}
	defer tx.Rollback(r.Context())

	var current user
	var expiresAt time.Time
	err = tx.QueryRow(r.Context(),
		`SELECT u.id::text, u.name, u.email, u.role, t.expires_at
		 FROM email_verification_tokens t JOIN users u ON u.id = t.user_id
		 WHERE t.token_hash = $1 FOR UPDATE OF t`,
		hashToken(token),
	).Scan(&current.ID, &current.Name, &current.Email, &current.Role, &expiresAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Link de verificação inválido ou já utilizado.")
		return
	}
	if !expiresAt.After(time.Now()) {
		writeError(w, http.StatusBadRequest, "O link de verificação expirou. Pedir um novo email.")
		return
	}
	if _, err := tx.Exec(r.Context(), `UPDATE users SET email_verified_at = NOW() WHERE id = $1`, current.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível verificar o email.")
		return
	}
	if _, err := tx.Exec(r.Context(), `DELETE FROM email_verification_tokens WHERE user_id = $1`, current.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível verificar o email.")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível verificar o email.")
		return
	}
	if err := s.createSession(w, r, current.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "Email verificado, mas não foi possível iniciar a sessão.")
		return
	}
	writeJSON(w, http.StatusOK, current)
}

func (s *Server) resendVerification(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Pedido inválido.")
		return
	}
	email, validEmail := normalizeEmail(input.Email)
	if validEmail {
		var current user
		var verified bool
		err := s.db.QueryRow(r.Context(),
			`SELECT id::text, name, email, role, email_verified_at IS NOT NULL FROM users WHERE lower(email) = $1`,
			email,
		).Scan(&current.ID, &current.Name, &current.Email, &current.Role, &verified)
		if err == nil && !verified {
			if err := s.issueVerificationToken(r.Context(), current); err != nil {
				log.Printf("SINALA verification resend failed: %v", err)
			}
		}
	}
	writeJSON(w, http.StatusAccepted, map[string]string{
		"message": "Se existir uma conta por verificar, enviámos um novo email.",
	})
}

func (s *Server) recovery(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Pedido inválido.")
		return
	}
	email, validEmail := normalizeEmail(input.Email)
	if validEmail {
		var current user
		var verified bool
		err := s.db.QueryRow(r.Context(),
			`SELECT id::text, name, email, role, email_verified_at IS NOT NULL FROM users WHERE lower(email) = $1`,
			email,
		).Scan(&current.ID, &current.Name, &current.Email, &current.Role, &verified)
		if err == nil && verified {
			if err := s.issuePasswordResetToken(r.Context(), current); err != nil {
				log.Printf("SINALA recovery email failed: %v", err)
			}
		}
	}
	writeJSON(w, http.StatusAccepted, map[string]string{
		"message": "Se a conta existir, receberá instruções para recuperar o acesso.",
	})
}

func (s *Server) resetPassword(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Pedido inválido.")
		return
	}
	if !validTokenFormat(input.Token) || !validPassword(input.Password) {
		writeError(w, http.StatusBadRequest, "Link inválido ou palavra-passe fora do formato permitido. "+passwordPolicyMessage())
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusBadRequest, passwordPolicyMessage())
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível redefinir a palavra-passe.")
		return
	}
	defer tx.Rollback(r.Context())

	var userID string
	var expiresAt time.Time
	err = tx.QueryRow(r.Context(),
		`SELECT user_id, expires_at FROM password_reset_tokens WHERE token_hash = $1 FOR UPDATE`,
		hashToken(input.Token),
	).Scan(&userID, &expiresAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Link de recuperação inválido ou já utilizado.")
		return
	}
	if !expiresAt.After(time.Now()) {
		writeError(w, http.StatusBadRequest, "O link de recuperação expirou. Peça um novo email.")
		return
	}
	if _, err := tx.Exec(r.Context(), `UPDATE users SET password_hash = $2 WHERE id = $1`, userID, string(passwordHash)); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível redefinir a palavra-passe.")
		return
	}
	if _, err := tx.Exec(r.Context(), `DELETE FROM sessions WHERE user_id = $1`, userID); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível redefinir a palavra-passe.")
		return
	}
	if _, err := tx.Exec(r.Context(), `DELETE FROM password_reset_tokens WHERE user_id = $1`, userID); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível redefinir a palavra-passe.")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível redefinir a palavra-passe.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
	if err != nil || len(cookie.Value) != tokenLength {
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
			allowed, retryAfter := s.allowRequest(r.URL.Path+"|"+s.clientIP(r), maximum, window)
			if !allowed {
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
				writeError(w, http.StatusTooManyRequests, "Demasiados pedidos. Aguarde antes de tentar novamente.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (s *Server) allowRequest(key string, maximum int, window time.Duration) (bool, int) {
	s.rateLimitMu.Lock()
	defer s.rateLimitMu.Unlock()
	now := time.Now()
	attempts := s.authRateLimits[key]
	recent := attempts[:0]
	for _, attempt := range attempts {
		if now.Sub(attempt) < window {
			recent = append(recent, attempt)
		}
	}
	if len(recent) >= maximum {
		s.authRateLimits[key] = recent
		retry := int((window - now.Sub(recent[0])).Seconds()) + 1
		return false, max(retry, 1)
	}
	s.authRateLimits[key] = append(recent, now)
	if len(s.authRateLimits) > 512 {
		for candidate, times := range s.authRateLimits {
			if len(times) == 0 || now.Sub(times[len(times)-1]) >= window {
				delete(s.authRateLimits, candidate)
			}
		}
	}
	return true, 0
}

func (s *Server) clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	if s.config.TrustProxy {
		if forwardedIP := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Real-IP"))); forwardedIP != nil {
			host = forwardedIP.String()
		}
	}
	return host
}

func (s *Server) issueVerificationToken(ctx context.Context, current user) error {
	token, err := newToken()
	if err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM email_verification_tokens WHERE user_id = $1`, current.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
		hashToken(token), current.ID, time.Now().Add(s.config.Mail.VerificationTTL),
	); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	link := s.config.Mail.VerificationLink(token)
	subject := "Confirme o seu email SINALA"
	textBody := "Confirme o seu email SINALA para activar a sua conta.\n\n" + link +
		"\n\nSe não criou esta conta, ignore esta mensagem."
	htmlBody := "<p>Confirme o seu email SINALA para activar a sua conta.</p><p><a href=\"" + html.EscapeString(link) +
		"\">Confirmar email</a></p><p>Se não criou esta conta, ignore esta mensagem.</p>"
	return s.config.Mail.Send(current.Email, subject, textBody, htmlBody)
}

func (s *Server) issuePasswordResetToken(ctx context.Context, current user) error {
	token, err := newToken()
	if err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM password_reset_tokens WHERE user_id = $1`, current.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
		hashToken(token), current.ID, time.Now().Add(s.config.Mail.ResetTTL),
	); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	link := s.config.Mail.ResetLink(token)
	subject := "Redefinir a palavra-passe SINALA"
	textBody := "Recebemos um pedido para redefinir a sua palavra-passe SINALA.\n\n" + link +
		"\n\nSe não fez este pedido, ignore esta mensagem. A sua palavra-passe não foi alterada."
	htmlBody := "<p>Recebemos um pedido para redefinir a sua palavra-passe SINALA.</p><p><a href=\"" + html.EscapeString(link) +
		"\">Redefinir palavra-passe</a></p><p>Se não fez este pedido, ignore esta mensagem. A sua palavra-passe não foi alterada.</p>"
	return s.config.Mail.Send(current.Email, subject, textBody, htmlBody)
}

func (s *Server) createSession(w http.ResponseWriter, r *http.Request, userID string) error {
	token, err := newToken()
	if err != nil {
		return err
	}
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

func decodeTokenBody(w http.ResponseWriter, r *http.Request) (string, bool) {
	var input struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil || !validTokenFormat(input.Token) {
		writeError(w, http.StatusBadRequest, "Token inválido.")
		return "", false
	}
	return input.Token, true
}

func normalizeEmail(value string) (string, bool) {
	email := strings.ToLower(strings.TrimSpace(value))
	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Name != "" || !strings.EqualFold(parsed.Address, email) {
		return "", false
	}
	return email, true
}

func validPassword(password string) bool {
	length := len([]byte(password))
	return length >= passwordMinBytes && length <= passwordMaxBytes
}

func passwordPolicyMessage() string {
	return "A palavra-passe deve ter entre " + strconv.Itoa(passwordMinBytes) + " e " + strconv.Itoa(passwordMaxBytes) + " bytes."
}

func newToken() (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(tokenBytes), nil
}

func validTokenFormat(token string) bool {
	if len(token) != tokenLength || strings.ToLower(token) != token {
		return false
	}
	_, err := hex.DecodeString(token)
	return err == nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
