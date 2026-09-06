package auth

import (
	"context"
	"net/http"

	"github.com/redis/go-redis/v9"
)

const ticketKeyPrefix = "sse:ticket:"

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
func (t *TicketValidator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ticket := r.URL.Query().Get("ticket")
		if ticket == "" {
			http.Error(w, `{"detail":"Missing ticket"}`, http.StatusUnauthorized)
			return
		}

		userID, err := t.redisClient.GetDel(r.Context(), ticketKeyPrefix+ticket).Result()
		if err != nil {
			// redis.Nil means the key never existed, already expired,
			// or was already consumed by an earlier request - all
			// three collapse to the same "invalid ticket" response,
			// so a used-twice attempt can't be distinguished from a
			// stale one by an attacker probing the endpoint.
			http.Error(w, `{"detail":"Invalid or expired ticket"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDContextKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
