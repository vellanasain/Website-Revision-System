package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

func TestRevisionStoreCreateUpdateFilterAndDelete(t *testing.T) {
	store := newMemoryRevisionStore()
	created, err := store.create(RevisionInput{Domain: "baru.test", ClientName: "Klien Baru", MarketingTeam: "Ayu", WebTeam: "Tim C", RevisionStatus: "R1", PaymentStatus: "50% Lunas", RemainingAmount: 1500000, ActivePeriod: "15/06/2026"})
	if err != nil {
		t.Fatalf("create revision: %v", err)
	}
	if created.ID == 0 || created.RevisionStatus != "R1" || created.PaymentStatus != "50% Lunas" {
		t.Fatalf("unexpected created revision: %#v", created)
	}

	filtered := store.list("baru", "R1")
	if len(filtered) != 1 || filtered[0].Domain != "baru.test" {
		t.Fatalf("unexpected filtered result: %#v", filtered)
	}

	updated, ok, err := store.update(created.ID, RevisionInput{Domain: "baru.test", ClientName: "Klien Baru", MarketingTeam: "Ayu", WebTeam: "Tim D", RevisionStatus: "R3", PaymentStatus: "Lunas", ActivePeriod: "20/06/2026", Notes: "Selesai"})
	if err != nil || !ok {
		t.Fatalf("update revision err=%v ok=%v", err, ok)
	}
	if updated.WebTeam != "Tim D" || updated.RevisionStatus != "R3" || updated.Notes != "Selesai" {
		t.Fatalf("unexpected updated revision: %#v", updated)
	}

	ok, err = store.delete(created.ID)
	if err != nil || !ok {
		t.Fatalf("delete revision err=%v ok=%v", err, ok)
	}
	ok, err = store.delete(999)
	if err != nil || ok {
		t.Fatalf("expected missing delete to fail without error, err=%v ok=%v", err, ok)
	}
}

func TestRevisionStoreValidation(t *testing.T) {
	store := newMemoryRevisionStore()
	if _, err := store.create(RevisionInput{Domain: ""}); err == nil {
		t.Fatal("expected empty domain validation error")
	}
	if _, err := store.create(RevisionInput{Domain: "valid.test", ClientName: "Klien", RemainingAmount: -1}); err == nil {
		t.Fatal("expected negative amount validation error")
	}
}

func TestRevisionAPIUpdateAndDelete(t *testing.T) {
	api := &api{store: newMemoryRevisionStore()}
	server := httptest.NewServer(withCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/revisions/") {
			api.revisionByID(w, r)
			return
		}
		api.revisions(w, r)
	})))
	defer server.Close()

	payload := `{"domain":"api.test","clientName":"API Client","marketingTeam":"Ayu","webTeam":"Tim API","revisionStatus":"R0","paymentStatus":"Belum Lunas","remainingAmount":100000}`
	res, err := http.Post(server.URL+"/api/revisions", "application/json", strings.NewReader(payload))
	if err != nil {
		t.Fatalf("post revision: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", res.StatusCode)
	}
	var created Revision
	if err := json.NewDecoder(res.Body).Decode(&created); err != nil {
		t.Fatalf("decode created revision: %v", err)
	}

	updatePayload := `{"domain":"api.test","clientName":"API Client","marketingTeam":"Ayu","webTeam":"Tim Baru","revisionStatus":"R2","paymentStatus":"50% Lunas","remainingAmount":50000}`
	req, err := http.NewRequest(http.MethodPut, server.URL+"/api/revisions/"+strconv.FormatInt(created.ID, 10), strings.NewReader(updatePayload))
	if err != nil {
		t.Fatalf("new put request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put revision: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}

	req, err = http.NewRequest(http.MethodDelete, server.URL+"/api/revisions/"+strconv.FormatInt(created.ID, 10), nil)
	if err != nil {
		t.Fatalf("new delete request: %v", err)
	}
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete revision: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", res.StatusCode)
	}
}
