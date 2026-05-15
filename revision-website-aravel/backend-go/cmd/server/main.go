package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const defaultDataPath = "data/revisions.json"

type Revision struct {
	ID              int64     `json:"id"`
	Domain          string    `json:"domain"`
	ClientName      string    `json:"clientName"`
	MarketingTeam   string    `json:"marketingTeam"`
	WebTeam         string    `json:"webTeam"`
	RevisionStatus  string    `json:"revisionStatus"`
	PaymentStatus   string    `json:"paymentStatus"`
	RemainingAmount int64     `json:"remainingAmount"`
	ActivePeriod    string    `json:"activePeriod"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type RevisionInput struct {
	Domain          string `json:"domain"`
	ClientName      string `json:"clientName"`
	MarketingTeam   string `json:"marketingTeam"`
	WebTeam         string `json:"webTeam"`
	RevisionStatus  string `json:"revisionStatus"`
	PaymentStatus   string `json:"paymentStatus"`
	RemainingAmount int64  `json:"remainingAmount"`
	ActivePeriod    string `json:"activePeriod"`
	Notes           string `json:"notes"`
}

type revisionStore struct {
	mu        sync.RWMutex
	path      string
	nextID    int64
	revisions []Revision
}

type revisionDiskData struct {
	NextID    int64      `json:"nextId"`
	Revisions []Revision `json:"revisions"`
}

type errBadRequest string

func (e errBadRequest) Error() string { return string(e) }

func newRevisionStore(path string) (*revisionStore, error) {
	store := &revisionStore{path: path, nextID: 1}
	if path == "" {
		store.seedDefaults()
		return store, nil
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("membuat folder data: %w", err)
	}

	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		store.seedDefaults()
		return store, store.persistLocked()
	}
	if err != nil {
		return nil, fmt.Errorf("membaca data revisi: %w", err)
	}

	var data revisionDiskData
	if err := json.Unmarshal(content, &data); err != nil {
		return nil, fmt.Errorf("mengurai data revisi: %w", err)
	}
	store.revisions = data.Revisions
	store.nextID = data.NextID
	if store.nextID <= 0 {
		store.nextID = nextRevisionID(store.revisions)
	}
	return store, nil
}

func newMemoryRevisionStore() *revisionStore {
	store := &revisionStore{nextID: 1}
	store.seedDefaults()
	return store
}

func (s *revisionStore) seedDefaults() {
	now := time.Now().UTC()
	s.revisions = []Revision{
		{ID: 1, Domain: "demo.smartchat.local", ClientName: "Budi Santoso", MarketingTeam: "Ayu", WebTeam: "Tim Website A", RevisionStatus: "R1", PaymentStatus: "50% Lunas", RemainingAmount: 2500000, ActivePeriod: now.AddDate(0, 1, 0).Format("02/01/2006"), Notes: "Menunggu revisi hero section.", CreatedAt: now.AddDate(0, 0, -5), UpdatedAt: now},
		{ID: 2, Domain: "company-profile.test", ClientName: "Sari Digital", MarketingTeam: "Ika", WebTeam: "Tim Website B", RevisionStatus: "R0", PaymentStatus: "Belum Lunas", RemainingAmount: 5000000, ActivePeriod: "-", Notes: "Konten profil perusahaan belum lengkap.", CreatedAt: now.AddDate(0, 0, -3), UpdatedAt: now.Add(-2 * time.Hour)},
		{ID: 3, Domain: "landing-page.test", ClientName: "PT Akselerasi", MarketingTeam: "Bella", WebTeam: "Tim Website A", RevisionStatus: "R3", PaymentStatus: "Lunas", RemainingAmount: 0, ActivePeriod: now.AddDate(0, 0, 21).Format("02/01/2006"), Notes: "Sudah disetujui klien.", CreatedAt: now.AddDate(0, 0, -8), UpdatedAt: now.Add(-24 * time.Hour)},
	}
	s.nextID = nextRevisionID(s.revisions)
}

func nextRevisionID(revisions []Revision) int64 {
	var maxID int64
	for _, item := range revisions {
		if item.ID > maxID {
			maxID = item.ID
		}
	}
	return maxID + 1
}

func (s *revisionStore) list(q, status string) []Revision {
	s.mu.RLock()
	defer s.mu.RUnlock()

	q = strings.ToLower(strings.TrimSpace(q))
	status = strings.ToLower(strings.TrimSpace(status))
	out := make([]Revision, 0, len(s.revisions))
	for _, item := range s.revisions {
		haystack := strings.ToLower(strings.Join([]string{item.Domain, item.ClientName, item.MarketingTeam, item.WebTeam, item.RevisionStatus, item.PaymentStatus, item.Notes}, " "))
		if q != "" && !strings.Contains(haystack, q) {
			continue
		}
		if status != "" && status != "all" && strings.ToLower(item.PaymentStatus) != status && strings.ToLower(item.RevisionStatus) != status {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (s *revisionStore) create(input RevisionInput) (Revision, error) {
	cleaned, err := cleanRevisionInput(input)
	if err != nil {
		return Revision{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	item := Revision{
		ID:              s.nextID,
		Domain:          cleaned.Domain,
		ClientName:      cleaned.ClientName,
		MarketingTeam:   cleaned.MarketingTeam,
		WebTeam:         cleaned.WebTeam,
		RevisionStatus:  cleaned.RevisionStatus,
		PaymentStatus:   cleaned.PaymentStatus,
		RemainingAmount: cleaned.RemainingAmount,
		ActivePeriod:    cleaned.ActivePeriod,
		Notes:           cleaned.Notes,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	s.nextID++
	s.revisions = append([]Revision{item}, s.revisions...)
	return item, s.persistLocked()
}

func (s *revisionStore) update(id int64, input RevisionInput) (Revision, bool, error) {
	cleaned, err := cleanRevisionInput(input)
	if err != nil {
		return Revision{}, false, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.revisions {
		if s.revisions[i].ID == id {
			s.revisions[i].Domain = cleaned.Domain
			s.revisions[i].ClientName = cleaned.ClientName
			s.revisions[i].MarketingTeam = cleaned.MarketingTeam
			s.revisions[i].WebTeam = cleaned.WebTeam
			s.revisions[i].RevisionStatus = cleaned.RevisionStatus
			s.revisions[i].PaymentStatus = cleaned.PaymentStatus
			s.revisions[i].RemainingAmount = cleaned.RemainingAmount
			s.revisions[i].ActivePeriod = cleaned.ActivePeriod
			s.revisions[i].Notes = cleaned.Notes
			s.revisions[i].UpdatedAt = time.Now().UTC()
			return s.revisions[i], true, s.persistLocked()
		}
	}
	return Revision{}, false, nil
}

func (s *revisionStore) delete(id int64) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.revisions {
		if s.revisions[i].ID == id {
			s.revisions = append(s.revisions[:i], s.revisions[i+1:]...)
			return true, s.persistLocked()
		}
	}
	return false, nil
}

func (s *revisionStore) persistLocked() error {
	if s.path == "" {
		return nil
	}
	payload, err := json.MarshalIndent(revisionDiskData{NextID: s.nextID, Revisions: s.revisions}, "", "  ")
	if err != nil {
		return fmt.Errorf("menyusun data revisi: %w", err)
	}
	return os.WriteFile(s.path, append(payload, '\n'), 0o644)
}

func cleanRevisionInput(input RevisionInput) (RevisionInput, error) {
	input.Domain = strings.TrimSpace(input.Domain)
	input.ClientName = strings.TrimSpace(input.ClientName)
	input.MarketingTeam = strings.TrimSpace(input.MarketingTeam)
	input.WebTeam = strings.TrimSpace(input.WebTeam)
	input.RevisionStatus = strings.TrimSpace(input.RevisionStatus)
	input.PaymentStatus = strings.TrimSpace(input.PaymentStatus)
	input.ActivePeriod = strings.TrimSpace(input.ActivePeriod)
	input.Notes = strings.TrimSpace(input.Notes)

	if input.Domain == "" {
		return input, errBadRequest("domain wajib diisi")
	}
	if input.ClientName == "" {
		return input, errBadRequest("nama klien wajib diisi")
	}
	if input.RevisionStatus == "" {
		input.RevisionStatus = "R0"
	}
	if input.PaymentStatus == "" {
		input.PaymentStatus = "Belum Lunas"
	}
	if input.ActivePeriod == "" {
		input.ActivePeriod = "-"
	}
	if input.RemainingAmount < 0 {
		return input, errBadRequest("sisa pelunasan tidak boleh negatif")
	}
	return input, nil
}

type api struct {
	store *revisionStore
}

func main() {
	dataPath := os.Getenv("REVISION_DATA_PATH")
	if dataPath == "" {
		dataPath = defaultDataPath
	}
	store, err := newRevisionStore(dataPath)
	if err != nil {
		log.Fatalf("failed to initialize revision store: %v", err)
	}

	mux := http.NewServeMux()
	api := &api{store: store}

	mux.HandleFunc("/health", api.health)
	mux.HandleFunc("/api/revisions", api.revisions)
	mux.HandleFunc("/api/revisions/", api.revisionByID)

	addr := ":8080"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}
	handler := withCORS(mux)
	log.Printf("Go revision API running at http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}

func (a *api) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *api) revisions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		revisions := a.store.list(r.URL.Query().Get("q"), r.URL.Query().Get("status"))
		writeJSON(w, http.StatusOK, map[string]any{
			"data":  revisions,
			"stats": buildStats(revisions),
		})
	case http.MethodPost:
		var input RevisionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "JSON tidak valid")
			return
		}
		item, err := a.store.create(input)
		if err != nil {
			handleStoreError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, item)
	case http.MethodOptions:
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method tidak didukung")
	}
}

func (a *api) revisionByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseRevisionID(r.URL.Path)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id revisi tidak valid")
		return
	}

	switch r.Method {
	case http.MethodPut, http.MethodPatch:
		var input RevisionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "JSON tidak valid")
			return
		}
		item, ok, err := a.store.update(id, input)
		if err != nil {
			handleStoreError(w, err)
			return
		}
		if !ok {
			writeError(w, http.StatusNotFound, "revisi tidak ditemukan")
			return
		}
		writeJSON(w, http.StatusOK, item)
	case http.MethodDelete:
		ok, err := a.store.delete(id)
		if err != nil {
			handleStoreError(w, err)
			return
		}
		if !ok {
			writeError(w, http.StatusNotFound, "revisi tidak ditemukan")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	case http.MethodOptions:
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method tidak didukung")
	}
}

func parseRevisionID(path string) (int64, error) {
	idPart := strings.TrimPrefix(path, "/api/revisions/")
	idPart = strings.Trim(idPart, "/")
	id, err := strconv.ParseInt(idPart, 10, 64)
	if err != nil || id <= 0 {
		return 0, errBadRequest("id revisi tidak valid")
	}
	return id, nil
}

func buildStats(revisions []Revision) map[string]int {
	stats := map[string]int{"total": len(revisions), "unpaid": 0, "processRevision": 0, "revisionDone": 0, "paid": 0}
	for _, item := range revisions {
		if item.PaymentStatus == "Belum Lunas" {
			stats["unpaid"]++
		}
		if item.PaymentStatus == "Lunas" {
			stats["paid"]++
		}
		if item.RevisionStatus == "R1" || item.RevisionStatus == "R2" {
			stats["processRevision"]++
		}
		if item.RevisionStatus == "R3" {
			stats["revisionDone"]++
		}
	}
	return stats
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func handleStoreError(w http.ResponseWriter, err error) {
	var badRequest errBadRequest
	if errors.As(err, &badRequest) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeError(w, http.StatusInternalServerError, "gagal menyimpan data revisi")
}
