// Package sse holds the SSE streaming handler this phase's ticket
// middleware fronts. Deliberately minimal for now - it proves a
// ticket-authenticated connection stays open and identifies its user,
// without yet subscribing to the risk.updates Redis stream
// (BLUEPRINT.md's full gateway fan-out is separate, larger plumbing
// than this phase's ticket-auth checklist covers).
package sse

import (
	"fmt"
	"net/http"
	"time"

	"github.com/Sharon-dt3/TradePulseProject02/gateway/internal/auth"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"detail":"Streaming unsupported"}`, http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "event: connected\ndata: {\"sub\":\"%s\"}\n\n", userID)
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			fmt.Fprint(w, ": heartbeat\n\n")
			flusher.Flush()
		}
	}
}
