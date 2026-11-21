package api

import (
	"encoding/json"
	"log"
	"net/http"
)

type apiError struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("SINALA response encoding failed: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeCodeError(w, status, "", message)
}

func writeCodeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, apiError{Error: message, Code: code})
}
