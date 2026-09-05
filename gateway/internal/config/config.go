package config

import (
	"fmt"
	"os"
)

// Config holds gateway's runtime settings, loaded from environment
// variables. JWKSURL and JWTIssuer mirror exactly what ledger-core and
// risk-engine already verify against (BLUEPRINT.md §4) — all three
// services trust the same Supabase Auth instance.
type Config struct {
	Port      string
	JWKSURL   string
	JWTIssuer string
}

// Load reads required environment variables, failing fast with a clear
// error rather than starting up with a blank JWKS URL.
func Load() (Config, error) {
	jwksURL := os.Getenv("SUPABASE_JWKS_URL")
	if jwksURL == "" {
		return Config{}, fmt.Errorf("SUPABASE_JWKS_URL is not set")
	}

	issuer := os.Getenv("SUPABASE_JWT_ISSUER")
	if issuer == "" {
		return Config{}, fmt.Errorf("SUPABASE_JWT_ISSUER is not set")
	}

	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = "8081"
	}

	return Config{Port: port, JWKSURL: jwksURL, JWTIssuer: issuer}, nil
}