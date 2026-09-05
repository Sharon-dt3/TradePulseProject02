package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/Sharon-dt3/TradePulseProject02/gateway/internal/auth"
	"github.com/Sharon-dt3/TradePulseProject02/gateway/internal/config"
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

	// /whoami: proves the middleware works, the same role
	// ledger-core's /actuator check and risk-engine's /whoami played.
	// The real sseHandler this middleware will front lands once
	// streaming itself is built in a later phase.
	whoami := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, _ := auth.UserIDFromContext(r.Context())
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"sub": userID})
	})
	mux.Handle("/whoami", verifier.Middleware(whoami))

	log.Printf("gateway listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatal(err)
	}
}