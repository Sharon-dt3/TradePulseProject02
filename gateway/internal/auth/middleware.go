package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/lestrrat-go/httprc/v3"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/lestrrat-go/jwx/v3/jwt"
)

// contextKey is an unexported type so this package's context values
// can never collide with another package's, even one also using a
// plain string as a key.
type contextKey string

const userIDContextKey contextKey = "userID"

// accountIDContextKey holds the account ID embedded in an SSE
// ticket (auth.TicketValidator) - never set by the JWT Verifier
// above, since a Bearer-authenticated request has no notion of
// "the account this connection is scoped to".
const accountIDContextKey contextKey = "accountID"

// Verifier wraps a JWKS cache and the expected issuer. It mirrors
// ledger-core's SecurityConfig and risk-engine's get_current_user — same
// rule (verify signature, expiry, issuer, audience), this language's
// idiom (middleware wrapping a handler, not a framework-level filter
// chain or FastAPI dependency).
type Verifier struct {
	cache   *jwk.Cache
	jwksURL string
	issuer  string
}

// NewVerifier registers the JWKS URL with a background-refreshing
// cache, so every request reuses cached keys instead of re-fetching
// Supabase's signing keys on every single call.
func NewVerifier(ctx context.Context, jwksURL, issuer string) (*Verifier, error) {
	cache, err := jwk.NewCache(ctx, httprc.NewClient())
	if err != nil {
		return nil, err
	}
	if err := cache.Register(ctx, jwksURL); err != nil {
		return nil, err
	}
	return &Verifier{cache: cache, jwksURL: jwksURL, issuer: issuer}, nil
}

// Middleware rejects any request without a valid Supabase-issued Bearer
// token — same 401 behavior as ledger-core and risk-engine — before
// passing the verified user ID down to the wrapped handler.
func (v *Verifier) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		const prefix = "Bearer "
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, prefix) {
			http.Error(w, `{"detail":"Not authenticated"}`, http.StatusUnauthorized)
			return
		}
		tokenString := strings.TrimPrefix(authHeader, prefix)

		keyset, err := v.cache.Lookup(r.Context(), v.jwksURL)
		if err != nil {
			http.Error(w, `{"detail":"Could not fetch signing keys"}`, http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(
			[]byte(tokenString),
			jwt.WithKeySet(keyset),
			jwt.WithIssuer(v.issuer),
			jwt.WithAudience("authenticated"),
		)
		if err != nil {
			http.Error(w, `{"detail":"Invalid token"}`, http.StatusUnauthorized)
			return
		}

		sub, _ := token.Subject()
		ctx := context.WithValue(r.Context(), userIDContextKey, sub)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserIDFromContext reads the verified user ID a handler can trust —
// only ever set after Middleware has already verified the token.
func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDContextKey).(string)
	return id, ok
}

// AccountIDFromContext reads the account ID an SSE ticket carried -
// only set for ticket-authenticated connections. The bool is false
// when the connected user has no trading account of their own (an
// admin/compliance-only login), not on any error.
func AccountIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(accountIDContextKey).(string)
	return id, ok
}
