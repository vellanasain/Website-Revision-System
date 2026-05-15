package main

import "testing"

func TestRevisionStoreCreateAndFilter(t *testing.T) {
	store := newRevisionStore()
	created, err := store.create(RevisionInput{Domain: "baru.test", ClientName: "Klien Baru", MarketingTeam: "Ayu", WebTeam: "Tim C"})
	if err != nil {
		t.Fatalf("create revision: %v", err)
	}
	if created.ID == 0 || created.RevisionStatus != "R0" {
		t.Fatalf("unexpected created revision: %#v", created)
	}

	filtered := store.list("baru", "all")
	if len(filtered) != 1 || filtered[0].Domain != "baru.test" {
		t.Fatalf("unexpected filtered result: %#v", filtered)
	}
}

func TestRevisionStoreUpdateAndDelete(t *testing.T) {
	store := newRevisionStore()
	updated, ok := store.updateTeam(1, "Tim Baru")
	if !ok || updated.WebTeam != "Tim Baru" {
		t.Fatalf("team not updated: %#v ok=%v", updated, ok)
	}
	if !store.delete(1) {
		t.Fatal("expected delete to succeed")
	}
	if store.delete(999) {
		t.Fatal("expected missing delete to fail")
	}
}
