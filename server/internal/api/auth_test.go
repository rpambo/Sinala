package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
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
