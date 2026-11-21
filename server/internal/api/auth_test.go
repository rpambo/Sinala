package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"sinala/server/internal/mailer"
)

func TestRateLimitUsesTrustedProxyClientIP(t *testing.T) {
	server := &Server{
		config:         Config{TrustProxy: true},
		authRateLimits: make(map[string][]time.Time),
	}
	handler := server.rateLimit(1, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	for _, clientIP := range []string{"203.0.113.1", "203.0.113.2"} {
		request := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
		request.RemoteAddr = "172.20.0.4:43120"
		request.Header.Set("X-Real-IP", clientIP)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusNoContent {
			t.Fatalf("client %s got status %d, want %d", clientIP, response.Code, http.StatusNoContent)
		}
	}

	request := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
	request.RemoteAddr = "172.20.0.4:43120"
	request.Header.Set("X-Real-IP", "203.0.113.1")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusTooManyRequests {
		t.Fatalf("repeated client got status %d, want %d", response.Code, http.StatusTooManyRequests)
	}
}

func TestRateLimitIsIndependentPerEndpoint(t *testing.T) {
	server := &Server{
		authRateLimits: make(map[string][]time.Time),
	}
	handler := server.rateLimit(1, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	for _, path := range []string{"/api/auth/login", "/api/auth/register"} {
		request := httptest.NewRequest(http.MethodPost, path, nil)
		request.RemoteAddr = "203.0.113.9:43120"
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusNoContent {
			t.Fatalf("%s returned status %d, want %d", path, response.Code, http.StatusNoContent)
		}
	}

	request := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
	request.RemoteAddr = "203.0.113.9:43120"
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusTooManyRequests {
		t.Fatalf("repeated login returned status %d, want %d", response.Code, http.StatusTooManyRequests)
	}
	if response.Header().Get("Retry-After") == "" {
		t.Fatal("rate limited response is missing Retry-After")
	}
}

func TestPasswordValidationMatchesBcryptLimit(t *testing.T) {
	tests := []struct {
		password string
		valid    bool
	}{
		{password: "1234567", valid: false},
		{password: "12345678", valid: true},
		{password: strings.Repeat("a", 72), valid: true},
		{password: strings.Repeat("a", 73), valid: false},
		{password: strings.Repeat("é", 37), valid: false},
	}
	for _, test := range tests {
		if got := validPassword(test.password); got != test.valid {
			t.Errorf("validPassword(%q bytes=%d) = %v, want %v", test.password[:min(8, len(test.password))], len([]byte(test.password)), got, test.valid)
		}
	}
}

func TestNormalizeEmailRejectsDisplayNames(t *testing.T) {
	if email, ok := normalizeEmail("  NOME@Exemplo.AO "); !ok || email != "nome@exemplo.ao" {
		t.Fatalf("normalizeEmail returned %q, %v", email, ok)
	}
	if _, ok := normalizeEmail("Nome <nome@exemplo.ao>"); ok {
		t.Fatal("display-name email should be rejected")
	}
}

func TestRegistrationRequiresConfiguredEmailService(t *testing.T) {
	server := New(nil, Config{WebOrigin: "http://localhost:4200"})
	body, err := json.Marshal(map[string]string{
		"name": "Cidadao", "email": "cidadao@exemplo.ao", "password": "password12",
	})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(string(body)))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", "http://localhost:4200")
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("register without SMTP returned status %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
}

func TestIdentityLinksUsePublicAppURL(t *testing.T) {
	config := mailer.Config{AppURL: "https://sinala.example.ao/"}
	if got := config.VerificationLink("abc"); got != "https://sinala.example.ao/verificar-email?token=abc" {
		t.Fatalf("verification link = %q", got)
	}
	if got := config.ResetLink("abc"); got != "https://sinala.example.ao/redefinir-password?token=abc" {
		t.Fatalf("reset link = %q", got)
	}
}

func TestTokenHelpers(t *testing.T) {
	valid := strings.Repeat("a", tokenLength)
	if !validTokenFormat(valid) {
		t.Fatal("valid hex token was rejected")
	}
	if validTokenFormat(strings.ToUpper(valid)) || validTokenFormat(valid[:tokenLength-1]) {
		t.Fatal("malformed token was accepted")
	}
	hash := hashToken(valid)
	if len(hash) != tokenLength || hash == valid {
		t.Fatalf("hashToken returned %q", hash)
	}
}

func TestRateLimitIgnoresForwardedIPUnlessProxyIsTrusted(t *testing.T) {
	server := &Server{
		authRateLimits: make(map[string][]time.Time),
	}
	handler := server.rateLimit(1, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	for i, expectedStatus := range []int{http.StatusNoContent, http.StatusTooManyRequests} {
		request := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
		request.RemoteAddr = "172.20.0.4:43120"
		request.Header.Set("X-Real-IP", "203.0.113.1")
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != expectedStatus {
			t.Fatalf("request %d got status %d, want %d", i+1, response.Code, expectedStatus)
		}
	}
}
