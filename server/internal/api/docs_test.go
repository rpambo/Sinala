package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSwaggerDocumentationRoutes(t *testing.T) {
	handler := New(nil, Config{WebOrigin: "http://localhost:4200"})
	tests := []struct {
		path        string
		contentType string
		contains    string
	}{
		{path: "/api/openapi.yaml", contentType: "application/yaml", contains: "openapi: 3.0.3"},
		{path: "/swagger/index.html", contentType: "text/html", contains: "Swagger UI"},
	}

	for _, test := range tests {
		request := httptest.NewRequest(http.MethodGet, test.path, nil)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Errorf("%s returned status %d, want %d", test.path, response.Code, http.StatusOK)
		}
		if contentType := response.Header().Get("Content-Type"); !strings.Contains(contentType, test.contentType) {
			t.Errorf("%s returned content type %q, want it to contain %q", test.path, contentType, test.contentType)
		}
		if !strings.Contains(response.Body.String(), test.contains) {
			t.Errorf("%s response does not contain %q", test.path, test.contains)
		}
	}
}
