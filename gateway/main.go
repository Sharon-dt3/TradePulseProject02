package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/Sharon-dt3/TradePulseProject02/gateway/internal/auth"
	"github.com/Sharon-dt3/TradePulseProject02/gateway/internal/config"
	"github.com/Sharon-dt3/TradePulseProject02/gateway/internal/sse"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	ctx := context.Background()
	verifier, err := auth.NewVerifier(ctx, cfg.JWKSURL, cfg.JWTIssuer)
	if err != nil {
		log.Fatalf("failed to initialize JWKS verifier: %v", err)
	}

	mux := http.NewServeMux()

	// /healthz stays exempt from auth — same rule as ledger-core and
	// risk-engine.
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// /whoami: proves the JWT middleware works, the same role
	// ledger-core's /actuator check and risk-engine's /whoami played.
	whoami := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, _ := auth.UserIDFromContext(r.Context())
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"sub": userID})
	})
	mux.Handle("/whoami", verifier.Middleware(whoami))

	// Phase 10: ticket-gated, not JWT-gated - EventSource can't set an
	// Authorization header, so this is a deliberately different
	// middleware from verifier.Middleware above, not a variant of it.
	// CORS wraps the outside: EventSource is a plain cross-origin GET
	// with no custom headers, so the browser sends no preflight, but
	// still requires Access-Control-Allow-Origin on the response before
	// it will let the dashboard's JS read it.
	ticketValidator := auth.NewTicketValidator(cfg.RedisAddr)
	sseHandler := ticketValidator.Middleware(http.HandlerFunc(sse.Handler))
	mux.Handle("/sse", corsMiddleware(cfg.AllowedOrigin, sseHandler))

	log.Printf("gateway listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatal(err)
	}
}

// corsMiddleware allows exactly one configured origin - the dashboard
// - rather than a wildcard, since a wildcard Access-Control-Allow-Origin
// would let any site's JS read this response.
func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		next.ServeHTTP(w, r)
	})
}