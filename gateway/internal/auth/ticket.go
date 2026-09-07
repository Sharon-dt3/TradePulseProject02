package auth

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/redis/go-redis/v9"
)

const ticketKeyPrefix = "sse:ticket:"

// ticketPayload mirrors ledger-core's StreamTicketService.TicketPayload -
// the JSON shape stored under a ticket's key. accountID is a pointer so a
// JSON null (the connected user has no trading account of their own)
// decodes to nil, kept distinguishable from a real, oddly-empty string.
type ticketPayload struct {
	UserID    string  `json:"userId"`
	AccountID *string `json:"accountId"`
}

// TicketValidator gates the SSE endpoint on a short-lived, single-use
// ticket ledger-core minted (StreamTicketService), instead of a JWT -
// EventSource can't set an Authorization header, so a raw JWT never
// goes in the URL (BLUEPRINT.md's "SSE auth").
//
// Deliberately does no JWT verification, signing, or minting of its
// own ("no parallel auth-minting on the Go side" - BLUEPRINT.md): it
// only ever consumes a ticket ledger-core already issued.
type TicketValidator struct {
	redisClient *redis.Client
}

func NewTicketValidator(redisAddr string) *TicketValidator {
	return &TicketValidator{redisClient: redis.NewClient(&redis.Options{Addr: redisAddr})}
}

// Middleware rejects any request with a missing, invalid, or
// already-consumed ticket. GetDel is atomic - the lookup and the
// delete happen as one Redis operation, so a ticket used twice
// concurrently can still only ever succeed once: the second caller's
// GetDel simply finds nothing, the same as an expired one.
//
// Cross-cutting integration check step 10: the stored value is now a
// JSON payload carrying accountID alongside userID, not a bare string
// - risk.updates events key off accountId, and this is how a
// ticket-authenticated SSE connection learns which account it's
// scoped to without gateway ever touching Postgres itself.
func (t *TicketValidator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ticket := r.URL.Query().Get("ticket")
		if ticket == "" {
			http.Error(w, `{"detail":"Missing ticket"}`, http.StatusUnauthorized)
			return
		}

		raw, err := t.redisClient.GetDel(r.Context(), ticketKeyPrefix+ticket).Result()
		if err != nil {
			// redis.Nil means the key never existed, already expired,
			// or was already consumed by an earlier request - all
			// three collapse to the same "invalid ticket" response,
			// so a used-twice attempt can't be distinguished from a
			// stale one by an attacker probing the endpoint.
			http.Error(w, `{"detail":"Invalid or expired ticket"}`, http.StatusUnauthorized)
			return
		}

		var payload ticketPayload
		if err := json.Unmarshal([]byte(raw), &payload); err != nil {
			http.Error(w, `{"detail":"Invalid or expired ticket"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDContextKey, payload.UserID)
		if payload.AccountID != nil {
			ctx = context.WithValue(ctx, accountIDContextKey, *payload.AccountID)
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
