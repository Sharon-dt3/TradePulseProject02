package com.tradepulse.ledgercore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Phase 0 baseline entrypoint. Flyway runs the {@code accounts} migration on
 * startup against SPRING_FLYWAY_URL (direct connection); application traffic
 * uses SPRING_DATASOURCE_URL (Supavisor pooled connection) — see
 * application.yml and BLUEPRINT.md §5.
 *
 * Auth (JWKS verification), ownership scoping, orders, and every other
 * concern land in later phases per IMPLEMENTATION_PLAN.md — this class is
 * intentionally minimal.
 */
@SpringBootApplication
public class LedgerCoreApplication {
    public static void main(String[] args) {
        SpringApplication.run(LedgerCoreApplication.class, args);
    }
}
