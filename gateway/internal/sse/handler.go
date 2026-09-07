// Package sse holds the SSE streaming handler this phase's ticket
// middleware fronts. Subscribes to the risk.updates Redis stream and
// forwards only the entries whose accountId matches this connection's
// own account - never another user's risk data over someone else's
// connection (BLUEPRINT.md's full gateway fan-out, deferred past
// Phase 10's ticket-auth checklist, built for the cross-cutting
// integration check's step 10).
package sse

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sharon-dt3/TradePulseProject02/gateway/internal/auth"
)

// Streamer holds the Redis client and stream name needed to fan out
// risk.updates - constructed once at startup in main.go and shared by
// every SSE connection, rather than opening a new Redis connection
// per browser tab.
type Streamer struct {
	redisClient *redis.Client
	streamName  string
}

func NewStreamer(redisClient *redis.Client, streamName string) *Streamer {
	return &Streamer{redisClient: redisClient, streamName: streamName}
}

// riskUpdate is one message read off the stream, paired with the ID it
// was read at (XREAD needs the previous ID to ask for "anything after
// this one" on the next call).
type riskUpdate struct {
	id     string
	fields map[string]interface{}
}

// Handle keeps the connection open with periodic heartbeats and
// forwards any risk.updates entry whose accountId matches this
// connection's own accountID. Starts reading from "$" - only entries
// published after this connection opened, live-tail semantics rather
// than replaying history; a client that misses an update while
// disconnected gets the latest snapshot from GET /risk/me on
// reconnect instead, the same best-effort trade-off already accepted
// on the risk-engine publishing side.
func (s *Streamer) Handle(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	accountID, hasAccount := auth.AccountIDFromContext(r.Context())

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

	ctx := r.Context()
	updates := make(chan riskUpdate)
	errs := make(chan error, 1)

	// XREAD blocks for up to 2s per call, so it runs on its own
	// goroutine - it can't share one select loop with the heartbeat
	// ticker below without one starving the other.
	go func() {
		lastID := "$"
		for {
			if ctx.Err() != nil {
				return
			}
			res, err := s.redisClient.XRead(ctx, &redis.XReadArgs{
				Streams: []string{s.streamName, lastID},
				Block:   2 * time.Second,
				Count:   50,
			}).Result()
			if err != nil {
				if err == redis.Nil || ctx.Err() != nil {
					continue // block timed out with nothing new - normal, keep polling
				}
				errs <- err
				return
			}
			for _, streamResult := range res {
				for _, msg := range streamResult.Messages {
					lastID = msg.ID
					select {
					case updates <- riskUpdate{id: msg.ID, fields: msg.Values}:
					case <-ctx.Done():
						return
					}
				}
			}
		}
	}()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-errs:
			return // connection's own context cancels on the way out; nothing more to write
		case <-ticker.C:
			fmt.Fprint(w, ": heartbeat\n\n")
			flusher.Flush()
		case u := <-updates:
			if !hasAccount || u.fields["accountId"] != accountID {
				continue // not this connection's own account - never forward another user's risk data
			}
			data, err := json.Marshal(u.fields)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "event: risk_update\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}
