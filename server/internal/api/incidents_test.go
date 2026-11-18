package api

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
)

func TestNewReferenceIsHighEntropyAndUnique(t *testing.T) {
	pattern := regexp.MustCompile(`^SNL-\d{4}-[A-Z2-7]{13}$`)
	seen := make(map[string]bool, 100)
	for range 100 {
		reference, err := newReference()
		if err != nil {
			t.Fatal(err)
		}
		if !pattern.MatchString(reference) {
			t.Fatalf("reference has an unexpected format: %q", reference)
		}
		if seen[reference] {
			t.Fatalf("duplicate reference generated: %q", reference)
		}
		seen[reference] = true
	}
}

func TestAdminIncidentsRequireASession(t *testing.T) {
	handler := New(nil, Config{WebOrigin: "http://localhost:4200"})
	request := httptest.NewRequest(http.MethodGet, "/api/admin/incidents", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, response.Code)
	}
}

func TestAccountIncidentsRequireASession(t *testing.T) {
	handler := New(nil, Config{WebOrigin: "http://localhost:4200"})
	request := httptest.NewRequest(http.MethodGet, "/api/account/incidents", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, response.Code)
	}
}

func TestMutationRequestsRejectUntrustedOrigins(t *testing.T) {
	handler := New(nil, Config{WebOrigin: "http://localhost:4200"})
	request := httptest.NewRequest(http.MethodPost, "/api/incidents", nil)
	request.Header.Set("Origin", "https://attacker.example")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, response.Code)
	}
}
