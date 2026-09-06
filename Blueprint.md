# TradePulse — Blueprint

Companion to `IMPLEMENTATION_PLAN.md`. This document is the system-level
reference: what exists, how it fits together, and every standing decision
that shapes it. The implementation plan is the operational breakdown of
*when* things get built; this is *what* gets built and *why* it's shaped
this way.

Build note: this is a **greenfield build** (see §7, OD-0). There is no
legacy TradePulse codebase in this repo. Wherever a phase description in the
original mission says "preserve," "extend," or "migrate" existing code, this
blueprint and its companion plan treat that as "implement to spec directly."

---

## 1. System Overview

Five services, polyglot by design:

| Service | Language/Stack | Responsibility |
|---|---|---|
| **ledger-core** | Java/Spring Boot, HikariCP, Flyway | Source of truth for accounts, orders, trades, journal entries, statements. Owns all writes to money-affecting tables. Issues SSE stream tickets. |
| **risk-engine** | Python/FastAPI, Alembic | Consumes ticks + ledger events, computes per-account risk metrics (VaR, volatility, Sharpe), persists snapshots. |
| **gateway** | Go | Public edge: JWKS-verified request routing, SSE fan-out to the dashboard, no business logic of its own. |
| **dashboard** | React/Next.js | Authenticated frontend. Talks to ledger-core and risk-engine through the gateway; renders positions, orders, risk, compliance views by role. |
| **infra** | Terraform | AWS resources (ALB, CloudFront, ElastiCache, EC2, IAM, networking, CloudWatch) plus Supabase-facing config (`secrets.tf`, `security.tf`, `user_data.sh.tftpl`). |

All persistent state (ledger + risk) lives in a single Supabase-hosted
Postgres instance (project: `tradePulseProject`, region `us-east-1`) — see
§5 for the connection topology and §7 OD-1 for why there is no local
Postgres fallback.

---

## 2. End-to-End Data Flow

```
                     ┌────────────────────────────────────────────┐
                     │              Supabase Auth                  │
                     │  (JWKS endpoint, Custom Access Token Hook)   │
                     └───────────────┬──────────────────────────────┘
                                     │ JWT (user_role claim)
                                     ▼
 dashboard ──HTTPS──▶ gateway ──verify JWT──▶ ledger-core ──┐
     ▲                   │                        │        │
     │                   │ SSE (ticket-auth)       │ writes │ writes
     │                   ▼                         ▼        ▼
     └───────────── risk.updates          orders/trades/journal/audit/outbox
                          ▲                                 │
                          │                          outbox relay
                          │                                 ▼
                    risk-engine ◀──── market.ticks ──── (external feed)
                          │      ◀──── ledger.updates ──────┘
                          │  (dedup by event_id, per-symbol history)
                          ▼
                   risk_snapshots (Postgres)
```

Order lifecycle (Phases 3/4/8): dashboard submits an order through
gateway → ledger-core resolves `account_id` from `jwt.sub` (never from the
client) → compliance checks (notional limit, position check) → idempotency
check → atomic write (trade + journal + fee + audit + outbox, one
transaction) → outbox relay publishes to `ledger.updates` → risk-engine
recomputes → `risk.updates` → gateway SSE → dashboard.

---

## 3. Data Model

All tables across all phases, by owning service. `NUMERIC`/`TIMESTAMPTZ`
throughout — no floating point for money, no naive timestamps.

### ledger-core (Flyway-managed)

- `accounts` (`id`, `user_id` → Supabase `auth.users.id`, `cash_balance
  numeric(19,4)`, `margin_enabled bool default false`, `frozen bool default
  false`, `created_at timestamptz`)
- `orders` (`id`, `account_id`, `symbol`, `side`, `order_type`, `quantity`,
  `limit_price nullable`, `status` — `CHECK IN ('NEW','WORKING','FILLED',
  'PARTIALLY_FILLED','CANCELLED','REJECTED','EXPIRED')`, `expires_at
  nullable`, `request_id`, `request_hash`, `created_at`)
- `trades` (`id`, `order_id` FK, `account_id`, `symbol`, `side`, `quantity`,
  `price`, `fee numeric(19,4)`, `created_at`)
- `journal_entries` / `journal_lines` (double-entry: every trade posts a
  balanced debit/credit pair including the fee line — see Phase 6)
- `audit_log` (append-only; every state-changing action, actor, target,
  timestamp)
- `outbox` (transactional outbox pattern — written in the same transaction
  as the domain write, relayed asynchronously to `ledger.updates`)
- `account_grants` (`account_id`, `grantee_user_id`, `purpose`, `reason`,
  `expires_at nullable`, `scope_start_date`/`scope_end_date` for Auditor —
  Phase 2/9)
- `user_roles` (`user_id`, `role`)
- `role_permissions` (`role`, `permission` — `resource.action[.scope]`
  vocabulary)
- `compliance_cases` (Phase 9)
- `ledger_adjustments` (`proposed_by`, `approved_by`, `CHECK (proposed_by <>
  approved_by)` — Phase 10 dual control)

### risk-engine (Alembic-managed)

- `risk_snapshots` (`account_id`, `var_95`, `volatility`, `sharpe`,
  `insufficient_history bool`, `computed_at timestamptz`)
- `price_history` (`symbol`, `price`, `observed_at timestamptz`)
- `pv_history` (`account_id`, `portfolio_value`, `observed_at`)
- `applied_events` (`event_id` unique — dedup ledger of consumed stream
  events, both `market.ticks` and `ledger.updates`)

### Supabase Storage

- Private bucket `statements` — path convention
  `statements/{user_id}/{account_id}/{date}.pdf`, signed URLs / Storage RLS
  keyed to `auth.uid()` (Phase 9).

Every table above gets `ENABLE ROW LEVEL SECURITY` the moment it's created
(Phase 0), even before policies exist (Phase 2) — deny-by-default is the
interim state, never open-by-default.

---

## 4. Security Model

- **AuthN:** Supabase Auth is the sole identity provider. No interim
  hardcoded-user or dev-JWT path is ever built (greenfield — nothing to cut
  over from).
- **Token verification:** independent JWKS verification in all three
  backend services — ledger-core (`NimbusJwtDecoder`), risk-engine (cached
  `PyJWKClient`), gateway (`lestrrat-go/jwx`). Each checks signature,
  `exp`, and `aud`/`iss`. `/health`/`/healthz` are the only exempt routes.
  JWKS endpoint unreachable → fail closed, everywhere.
- **AuthZ / ownership scoping:** `account_id` is never trusted from the
  client — always derived from `jwt.sub` or checked against
  `account_grants`. This is the fix for the IDOR pattern the original
  mission called out; there being no legacy hardcoded-auth path to migrate
  away from doesn't remove the requirement, it just means it's correct from
  commit one.
- **RBAC:** roles — trader, viewer, delegated_viewer, compliance,
  risk_manager, admin, support, auditor. Custom Access Token Hook injects
  `user_role` (never Supabase-reserved `role`) into the JWT, additive only.
  `authorize()` security-definer function backs both service-layer checks
  and RLS policies, so a bypassed service-layer check still can't read
  another account's row directly via psql.
- **RLS policy shape** (one shape, reused per table): self-owned OR
  granted-and-unexpired (checked live, not just at grant creation) OR
  `authorize('resource.action.any')`.
- **Dual control:** admin ledger adjustments require `proposed_by <>
  approved_by`, enforced as a database `CHECK` constraint — not just
  application trust.
- **SSE auth:** `EventSource` can't set headers, so raw JWTs never go in a
  URL. ledger-core issues short-lived, single-use stream tickets via REST;
  gateway validates tickets only, reusing its JWKS cache.
- **Credentials:** only ledger-core and risk-engine hold Postgres
  credentials (`service_role`/direct `DATABASE_URL`). `anon` key only in
  the dashboard bundle. `service_role` key is server-side only, never
  shipped to the client.

---

## 5. Infra & Connection Topology

- **Database:** Supabase-hosted Postgres, project `tradePulseProject`,
  region `us-east-1`. See §7 OD-1 — Supabase is the only Postgres this
  system ever talks to; there is no local Docker Compose Postgres fallback.
- **Pooling:** Supavisor (transaction-mode pooled connection) for all
  application traffic. A direct, unpooled connection string is reserved
  exclusively for Flyway and Alembic migrations — never used by
  ledger-core's or risk-engine's runtime traffic.
- **Compatibility check:** Supavisor pooling is tested against
  ledger-core's HikariCP/JDBC prepared-statement caching in Phase 0;
  caching is disabled if it misbehaves under the pooler.
- **Terraform:** no `rds.tf` resource is ever defined (greenfield — nothing
  to remove). `secrets.tf` points at Supabase credentials from the start.
  `security.tf` has no RDS ingress rule. `user_data.sh.tftpl` is written
  against the Supabase connection model. `alb.tf`, `cloudfront.tf`,
  `elasticache.tf`, `ec2.tf`, `iam.tf`, `network.tf`, `cloudwatch.tf` are
  written independently of the database decision — no coupling to the
  Postgres choice either way.
- **Backups:** Supabase plan tier is confirmed to include automated
  backups/PITR before Phase 0 is considered done.
- **Streams:** Redis-backed streams (`market.ticks`, `ledger.updates`,
  `risk.updates`) with consumer groups (`cg:ledger-core`,
  `cg:risk-engine`), idempotent group creation tolerating `BUSYGROUP`.

---

## 6. Contract & Versioning Policy

- **Error shape:** `{code, message}` adopted platform-wide starting Phase 3
  — every service that returns an error after that point uses this shape.
- **Frozen contracts:** any type explicitly declared "frozen-v1" requires a
  version bump or a documented exception to add a new value — never a
  silent edit. `TradeResult.rejection_reason` is not such a type: OD-2
  (§7) resolved it as left open until v1 ships, so new values (e.g.
  Phase 4's `INSUFFICIENT_POSITION`) may be added freely for now.
- **Idempotency:** canonical-JSON SHA-256 over meaningful order fields
  (excluding `request_id`/timestamps), decimal-scale-normalized before
  hashing, so `"10.0"` and `"10.00"` don't produce false conflicts.
  Mismatched-hash replay under the same key → `409
  IDEMPOTENCY_KEY_REUSED`.
- **Deferred scope (Phase 11):** margin accounts, real short-selling, and
  correlation-aware VaR are explicitly out of the initial build. Each is
  documented at the point the simpler approach was chosen (Phase 7's
  zero-correlation note, Phase 4's no-margin note) rather than silently
  dropped, so the boundary reads as a decision, not an oversight.

---

## 7. Open Decisions Log

| ID | Decision | Status | Rationale |
|---|---|---|---|
| **OD-0** | Is this a migration of an existing codebase, or a greenfield build? | **Resolved: greenfield.** | Repo confirmed empty at Phase B start — no legacy TradePulse code exists anywhere to preserve, extend, or migrate. Every "preserve/extend/migrate X" instruction in the source mission is read as "implement X to spec directly." Phase order and dependencies (B→0→1→2→3→4/5/6→7‖→8→9→10→11-deferred) are unchanged by this — they reflect build-order dependencies, not migration mechanics. |
| **OD-1** | Local Postgres Docker Compose as an offline-dev fallback, or Supabase-required even locally? | **Resolved: Supabase-only, no local fallback.** | A real Supabase project (`tradePulseProject`, `us-east-1`) already exists. RLS (Phase 0) and the `authorize()`/claim-hook RBAC model (Phase 2) are Supabase-native — a local Postgres fallback would test a materially weaker security model, defeating the purpose of catching RLS/auth bugs early, and would require hand-syncing two migration paths (Flyway + Alembic against two targets) with real drift risk. Downside accepted: no fully offline dev workflow. |
| **OD-2** | Should `TradeResult.rejection_reason` be declared frozen-v1 from its very first commit, or left open until v1 ships? | **Resolved: left open until v1 ships.** | Matches what Phase 3 already implemented — `RejectionReason`'s javadoc and `V12__orders_rejection_reason.sql` both already document it as deliberately non-frozen. New rejection reasons (e.g. Phase 4's `INSUFFICIENT_POSITION`) may be added freely; this gets revisited only if an external consumer starts depending on today's exact value set. |

Gate for Phase B (per `IMPLEMENTATION_PLAN.md`): no source file outside
this document and `IMPLEMENTATION_PLAN.md` may be touched until OD-0 and
OD-1 are resolved. All three are resolved above — OD-2's resolution unblocks Phase 4.