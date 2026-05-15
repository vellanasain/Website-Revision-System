package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

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
	UpdatedAt       time.Time `json:"updatedAt"`
}

type RevisionInput struct {
	Domain          string `json:"domain"`
	ClientName      string `json:"clientName"`
	MarketingTeam   string `json:"marketingTeam"`
	WebTeam         string `json:"webTeam"`
	RemainingAmount int64  `json:"remainingAmount"`
}

type revisionStore struct {
	mu        sync.RWMutex
	nextID    int64
	revisions []Revision
}

func newRevisionStore() *revisionStore {
	now := time.Now().UTC()
	return &revisionStore{
		nextID: 4,
		revisions: []Revision{
			{ID: 1, Domain: "demo.smartchat.local", ClientName: "Budi Santoso", MarketingTeam: "Ayu", WebTeam: "Tim Website A", RevisionStatus: "R1", PaymentStatus: "50% Lunas", RemainingAmount: 2500000, ActivePeriod: now.AddDate(0, 1, 0).Format("02/01/2006"), UpdatedAt: now},
			{ID: 2, Domain: "company-profile.test", ClientName: "Sari Digital", MarketingTeam: "Ika", WebTeam: "Tim Website B", RevisionStatus: "R0", PaymentStatus: "Belum Lunas", RemainingAmount: 5000000, ActivePeriod: "-", UpdatedAt: now.Add(-2 * time.Hour)},
			{ID: 3, Domain: "landing-page.test", ClientName: "PT Akselerasi", MarketingTeam: "Bella", WebTeam: "Tim Website A", RevisionStatus: "R3", PaymentStatus: "Lunas", RemainingAmount: 0, ActivePeriod: now.AddDate(0, 0, 21).Format("02/01/2006"), UpdatedAt: now.Add(-24 * time.Hour)},
		},
	}
}

func (s *revisionStore) list(q, status string) []Revision {
	s.mu.RLock()
	defer s.mu.RUnlock()

	q = strings.ToLower(strings.TrimSpace(q))
	status = strings.ToLower(strings.TrimSpace(status))
	out := make([]Revision, 0, len(s.revisions))
	for _, item := range s.revisions {
		haystack := strings.ToLower(strings.Join([]string{item.Domain, item.ClientName, item.MarketingTeam, item.WebTeam, item.RevisionStatus, item.PaymentStatus}, " "))
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
	if strings.TrimSpace(input.Domain) == "" {
		return Revision{}, errBadRequest("domain wajib diisi")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	item := Revision{
		ID:              s.nextID,
		Domain:          strings.TrimSpace(input.Domain),
		ClientName:      strings.TrimSpace(input.ClientName),
		MarketingTeam:   strings.TrimSpace(input.MarketingTeam),
		WebTeam:         strings.TrimSpace(input.WebTeam),
		RevisionStatus:  "R0",
		PaymentStatus:   "Belum Lunas",
		RemainingAmount: input.RemainingAmount,
		ActivePeriod:    "-",
		UpdatedAt:       time.Now().UTC(),
	}
	s.nextID++
	s.revisions = append([]Revision{item}, s.revisions...)
	return item, nil
}

func (s *revisionStore) updateTeam(id int64, webTeam string) (Revision, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.revisions {
		if s.revisions[i].ID == id {
			s.revisions[i].WebTeam = strings.TrimSpace(webTeam)
			s.revisions[i].UpdatedAt = time.Now().UTC()
			return s.revisions[i], true
		}
	}
	return Revision{}, false
}

func (s *revisionStore) delete(id int64) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.revisions {
		if s.revisions[i].ID == id {
			s.revisions = append(s.revisions[:i], s.revisions[i+1:]...)
			return true
		}
	}
	return false
}

type errBadRequest string

func (e errBadRequest) Error() string { return string(e) }

type api struct {
	store *revisionStore
}

func main() {
	mux := http.NewServeMux()
	api := &api{store: newRevisionStore()}

	mux.HandleFunc("/health", api.health)
	mux.HandleFunc("/api/revisions", api.revisions)
	mux.HandleFunc("/api/revisions/", api.revisionByID)

	handler := withCORS(mux)
	log.Println("Go revision API running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
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
			writeError(w, http.StatusBadRequest, err.Error())
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
	id, err := strconv.ParseInt(strings.TrimPrefix(r.URL.Path, "/api/revisions/"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "id revisi tidak valid")
		return
	}

	switch r.Method {
	case http.MethodPatch:
		var input struct {
			WebTeam string `json:"webTeam"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "JSON tidak valid")
			return
		}
		item, ok := a.store.updateTeam(id, input.WebTeam)
		if !ok {
			writeError(w, http.StatusNotFound, "revisi tidak ditemukan")
			return
		}
		writeJSON(w, http.StatusOK, item)
	case http.MethodDelete:
		if !a.store.delete(id) {
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

func buildStats(revisions []Revision) map[string]int {
	stats := map[string]int{"total": len(revisions), "unpaid": 0, "processRevision": 0, "revisionDone": 0}
	for _, item := range revisions {
		if item.PaymentStatus == "Belum Lunas" {
			stats["unpaid"]++
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
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
