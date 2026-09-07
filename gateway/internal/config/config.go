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
	Port              string
	JWKSURL           string
	JWTIssuer         string
	RedisAddr         string
	AllowedOrigin     string
	RiskUpdatesStream string
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

	// Phase 10: same REDIS_HOST/REDIS_PORT convention ledger-core's
	// application.yml already uses, so the two services agree on where
	// Redis lives without needing a third naming scheme.
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}

	// Same default and env-var naming convention as ledger-core's
	// ledger.cors.allowed-origins - both services front the same
	// dashboard, so they should agree on where it's allowed from.
	allowedOrigin := os.Getenv("GATEWAY_CORS_ALLOWED_ORIGINS")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3000"
	}

	// Cross-cutting integration check step 9/10: same stream name
	// risk-engine's RISK_UPDATES_STREAM setting defaults to - the two
	// services must agree on this, since risk-engine publishes and
	// gateway subscribes to the very same Redis stream.
	riskUpdatesStream := os.Getenv("RISK_UPDATES_STREAM")
	if riskUpdatesStream == "" {
		riskUpdatesStream = "risk.updates"
	}

	return Config{
		Port:              port,
		JWKSURL:           jwksURL,
		JWTIssuer:         issuer,
		RedisAddr:         redisHost + ":" + redisPort,
		AllowedOrigin:     allowedOrigin,
		RiskUpdatesStream: riskUpdatesStream,
	}, nil
}
