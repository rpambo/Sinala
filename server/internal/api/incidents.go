package api

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var categories = map[string]bool{
	"Internet lenta":          true,
	"Sem ligação":             true,
	"Interrupções frequentes": true,
	"Cobertura insuficiente":  true,
	"Instabilidade":           true,
	"Outro":                   true,
}

var provinces = map[string][2]float64{
	"Luanda":   {-8.8383, 13.2344},
	"Benguela": {-12.5763, 13.4055},
	"Huíla":    {-14.9177, 13.4925},
	"Huambo":   {-12.7761, 15.7392},
	"Cabinda":  {-5.5500, 12.2000},
	"Namibe":   {-15.1961, 12.1522},
	"Uíge":     {-7.6087, 15.0613},
	"Malanje":  {-9.5402, 16.3410},
}

type historyEntry struct {
	Status string    `json:"status"`
	Date   time.Time `json:"date"`
	Note   string    `json:"note"`
}

type incident struct {
	ID               string         `json:"id"`
	Reference        string         `json:"reference"`
	Category         string         `json:"category"`
	Description      string         `json:"description"`
	Provider         string         `json:"provider"`
	Province         string         `json:"province"`
	Municipality     string         `json:"municipality"`
	Neighborhood     string         `json:"neighborhood"`
	Latitude         float64        `json:"latitude"`
	Longitude        float64        `json:"longitude"`
	CreatedAt        time.Time      `json:"createdAt"`
	Status           string         `json:"status"`
	AIClassification string         `json:"aiClassification"`
	History          []historyEntry `json:"history"`
	HasAttachment    bool           `json:"hasAttachment"`
}

const incidentColumns = `id::text, reference, category, description, provider, province,
	municipality, neighborhood, latitude, longitude, created_at, status, ai_classification,
	attachment IS NOT NULL`
const publicIncidentColumns = `id::text, reference, category, ''::text, provider, province,
	 municipality, ''::text, latitude, longitude, created_at, status, ai_classification,
	 attachment IS NOT NULL`

func (s *Server) listPublicIncidents(w http.ResponseWriter, r *http.Request) {
	listIncidents(w, r, s.db, publicIncidentColumns)
}

func (s *Server) listAdminIncidents(w http.ResponseWriter, r *http.Request) {
	listIncidents(w, r, s.db, incidentColumns)
}

func (s *Server) listAccountIncidents(w http.ResponseWriter, r *http.Request) {
	current, ok := r.Context().Value(userContextKey).(user)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Inicie sessão para continuar.")
		return
	}
	rows, err := s.db.Query(r.Context(),
		`SELECT `+incidentColumns+` FROM incidents WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT $2`,
		current.ID, 1000,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível carregar os seus reportes.")
		return
	}
	defer rows.Close()
	items := make([]incident, 0)
	for rows.Next() {
		item, err := scanIncident(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Não foi possível ler os seus reportes.")
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível ler os seus reportes.")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func listIncidents(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool, columns string) {
	rows, err := db.Query(r.Context(),
		`SELECT `+columns+` FROM incidents ORDER BY created_at DESC LIMIT $1`, 1000)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível carregar os reportes.")
		return
	}
	defer rows.Close()

	items := make([]incident, 0)
	for rows.Next() {
		item, err := scanIncident(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Não foi possível ler os reportes.")
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível ler os reportes.")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) getIncident(w http.ResponseWriter, r *http.Request) {
	reference := strings.TrimSpace(chi.URLParam(r, "reference"))
	if len(reference) > 40 {
		writeError(w, http.StatusBadRequest, "Referência inválida.")
		return
	}
	item, err := loadPublicIncident(r.Context(), s.db, reference)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "Reporte não encontrado.")
			return
		}
		writeError(w, http.StatusInternalServerError, "Não foi possível consultar o reporte.")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) createIncident(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 6<<20)
	if err := r.ParseMultipartForm(6 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Pedido inválido ou anexo superior a 5 MB.")
		return
	}

	category := strings.TrimSpace(r.FormValue("category"))
	provider := strings.TrimSpace(r.FormValue("provider"))
	description := strings.TrimSpace(r.FormValue("description"))
	province := strings.TrimSpace(r.FormValue("province"))
	municipality := strings.TrimSpace(r.FormValue("municipality"))
	neighborhood := strings.TrimSpace(r.FormValue("neighborhood"))
	coordinates, provinceExists := provinces[province]
	if !categories[category] || !provinceExists || len(municipality) < 2 || len(municipality) > 100 ||
		len(description) < 12 || len(description) > 500 || len(provider) > 100 || len(neighborhood) > 100 {
		writeError(w, http.StatusBadRequest, "Verifique os campos obrigatórios do reporte.")
		return
	}

	var attachment []byte
	var attachmentType, attachmentName string
	file, header, err := r.FormFile("attachment")
	if err == nil {
		defer file.Close()
		attachment, err = io.ReadAll(io.LimitReader(file, (5<<20)+1))
		if err != nil || len(attachment) > 5<<20 {
			writeError(w, http.StatusBadRequest, "O anexo deve ter no máximo 5 MB.")
			return
		}
		attachmentType = http.DetectContentType(attachment)
		if attachmentType != "image/jpeg" && attachmentType != "image/png" && attachmentType != "image/webp" {
			writeError(w, http.StatusBadRequest, "O anexo deve ser uma imagem JPEG, PNG ou WebP.")
			return
		}
		attachmentName = safeFilename(header.Filename)
		if len(attachmentName) > 200 {
			attachmentName = attachmentName[len(attachmentName)-200:]
		}
	} else if err != http.ErrMissingFile {
		writeError(w, http.StatusBadRequest, "Não foi possível ler o anexo.")
		return
	}

	reference, err := newReference()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível criar a referência.")
		return
	}
	itemID := uuid.NewString()
	var ownerID any
	if current, ok, authErr := s.authenticate(r.Context(), r); authErr != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível verificar a sessão.")
		return
	} else if ok {
		ownerID = current.ID
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível guardar o reporte.")
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		`INSERT INTO incidents (id, reference, category, description, provider, province, municipality,
		 neighborhood, latitude, longitude, owner_user_id, attachment, attachment_type, attachment_name)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULLIF($13, ''), NULLIF($14, ''))`,
		itemID, reference, category, description, provider, province, municipality, neighborhood,
		coordinates[0], coordinates[1], ownerID, nullableBytes(attachment), attachmentType, attachmentName,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível guardar o reporte.")
		return
	}
	_, err = tx.Exec(r.Context(),
		`INSERT INTO incident_history (incident_id, status, note) VALUES ($1, 'Recebido', 'Reporte submetido pela comunidade.')`,
		itemID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível guardar o histórico do reporte.")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível concluir o reporte.")
		return
	}

	item, err := loadPublicIncident(r.Context(), s.db, reference)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "O reporte foi guardado, mas não foi possível carregá-lo.")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) updateStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Estado inválido.")
		return
	}
	if input.Status != "Recebido" && input.Status != "Em análise" &&
		input.Status != "Classificado" && input.Status != "Encerrado" {
		writeError(w, http.StatusBadRequest, "Estado inválido.")
		return
	}
	reference := strings.TrimSpace(chi.URLParam(r, "reference"))
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível actualizar o reporte.")
		return
	}
	defer tx.Rollback(r.Context())

	var itemID string
	err = tx.QueryRow(r.Context(),
		`UPDATE incidents SET status = $1 WHERE reference = $2 RETURNING id::text`,
		input.Status, reference,
	).Scan(&itemID)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "Reporte não encontrado.")
			return
		}
		writeError(w, http.StatusInternalServerError, "Não foi possível actualizar o reporte.")
		return
	}
	_, err = tx.Exec(r.Context(),
		`INSERT INTO incident_history (incident_id, status, note) VALUES ($1, $2, $3)`,
		itemID, input.Status, fmt.Sprintf("Estado actualizado pela equipa SINALA para “%s”.", input.Status),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível guardar o histórico do reporte.")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Não foi possível concluir a actualização.")
		return
	}
	item, err := loadIncident(r.Context(), s.db, reference)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Estado actualizado, mas não foi possível carregar o reporte.")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) downloadAttachment(w http.ResponseWriter, r *http.Request) {
	reference := strings.TrimSpace(chi.URLParam(r, "reference"))
	var content []byte
	var contentType, filename string
	err := s.db.QueryRow(r.Context(),
		`SELECT attachment, attachment_type, attachment_name FROM incidents WHERE reference = UPPER($1) AND attachment IS NOT NULL`,
		strings.ToUpper(reference),
	).Scan(&content, &contentType, &filename)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "Anexo não encontrado.")
			return
		}
		writeError(w, http.StatusInternalServerError, "Não foi possível carregar o anexo.")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": safeFilename(filename)}))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(content)
}

func scanIncident(row pgx.Row) (incident, error) {
	var item incident
	err := row.Scan(
		&item.ID, &item.Reference, &item.Category, &item.Description, &item.Provider,
		&item.Province, &item.Municipality, &item.Neighborhood, &item.Latitude, &item.Longitude,
		&item.CreatedAt, &item.Status, &item.AIClassification, &item.HasAttachment,
	)
	return item, err
}

func loadIncident(ctx context.Context, db *pgxpool.Pool, reference string) (incident, error) {
	return loadIncidentWithColumns(ctx, db, reference, incidentColumns)
}

func loadPublicIncident(ctx context.Context, db *pgxpool.Pool, reference string) (incident, error) {
	return loadIncidentWithColumns(ctx, db, reference, publicIncidentColumns)
}

func loadIncidentWithColumns(ctx context.Context, db *pgxpool.Pool, reference string, columns string) (incident, error) {
	item, err := scanIncident(db.QueryRow(ctx,
		`SELECT `+columns+` FROM incidents WHERE reference = UPPER($1)`,
		strings.ToUpper(reference),
	))
	if err != nil {
		return incident{}, err
	}
	rows, err := db.Query(ctx,
		`SELECT status, created_at, note FROM incident_history WHERE incident_id = $1 ORDER BY created_at, id`,
		item.ID,
	)
	if err != nil {
		return incident{}, err
	}
	defer rows.Close()
	item.History = make([]historyEntry, 0)
	for rows.Next() {
		var entry historyEntry
		if err := rows.Scan(&entry.Status, &entry.Date, &entry.Note); err != nil {
			return incident{}, err
		}
		item.History = append(item.History, entry)
	}
	return item, rows.Err()
}

func newReference() (string, error) {
	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	randomPart := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(random)
	return fmt.Sprintf("SNL-%d-%s", time.Now().Year(), randomPart), nil
}

func nullableBytes(value []byte) any {
	if len(value) == 0 {
		return nil
	}
	return value
}

func safeFilename(filename string) string {
	name := path.Base(strings.ReplaceAll(filename, `\`, "/"))
	if name == "." || name == "/" {
		return "attachment"
	}
	return name
}
