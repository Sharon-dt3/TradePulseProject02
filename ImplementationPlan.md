# TradePulse — Implementation Plan

Companion to BLUEPRINT.md. This is the operational breakdown: one section per
phase, each with its dependency (and reason), a concrete task checklist, the
verification checkpoint that defines "done," and a status field. Status
values: `not started` / `in progress` / `done`.

Build note: this is a greenfield build (see BLUEPRINT.md §7, OD-0). Wherever
the original mission language says "preserve," "extend," or "migrate"
existing code, read the corresponding task below as "implement this to spec
directly" — there is no legacy TradePulse codebase in this repo.

---

## Dependency Graph Summary

```
B -> 0 -> 1 -> 2 -------------------> 9 -> 10
              \-> 3 -> 4 -> 8 --------/     ^
              |    \-> 5               |    |
              |    \-> 6               |    |
              0 -> 7 (parallel to 3-6) |    |
                                       (4,7) -> 11 (deferred)
              1 --------------------------> 10
```

- **Strictly sequential spine:** B → 0 → 1 → 2 → 9 → 10.
- **Phase 3** depends only on Phase 1 (not Phase 2) — order execution needs
  ownership scoping, not the full RBAC model yet.
- **Phases 4, 5, 6** each depend on Phase 3 only, and do not depend on each
  other — they may be built in any order once 3 is done, though 8 needs 4.
- **Phase 7 is independent of 3–6** — it depends only on Phase 0 and may run
  in parallel with all of them.
- **Phase 8** depends on both 3 and 4.
- **Phase 9** depends on Phase 2, not on 3–8.
- **Phase 10** depends on both Phase 1 and Phase 9.
- **Phase 11** is explicitly deferred; its prerequisites (4, 7) being solid
  is a precondition for ever starting it, not a task in this build.

---

## Phase B — Blueprint & Implementation Plan

**Depends on:** nothing. True root of the dependency graph.

**Task checklist:**
- [x] Write `BLUEPRINT.md` covering system overview, data flow, data model,
      security model, infra topology, contract policy, open decisions log.
- [x] Write `IMPLEMENTATION_PLAN.md` (this document) with one section per
      phase, dependency + reason, task checklist, verification checkpoint,
      status field.
- [x] Record the greenfield-vs-migration decision (OD-0) explicitly and
      resolve it.
- [ ] Resolve OD-1 (local Postgres dev fallback) before Phase 0 begins.
- [ ] Resolve OD-2 (frozen-v1 status of `TradeResult.rejection_reason`)
      before Phase 4 begins — does not block Phase 0–3.
- [x] Confirm no source file outside these two markdown files has been
      modified.

**Verification checkpoint:** `BLUEPRINT.md` and `IMPLEMENTATION_PLAN.md`
exist at repo root; every phase in this document has a non-empty task
checklist and a verification checkpoint; every "stop and ask" decision is
listed in BLUEPRINT.md §7, resolved or explicitly marked unresolved; no
other source file has been touched.

**Status:** in progress — blocked on OD-1 confirmation before Phase 0 can
start (OD-2 does not block Phase 0).

---

## Phase 0 — Foundation: Supabase, schema migration, Terraform

**Depends on:** Phase B. Root of the infra dependency graph — every later
phase writes to this database or authenticates against this Supabase
project.

**Task checklist:**
- [ ] Create Supabase project; record project URL, anon key, service_role
      key (service_role server-side only, never in the dashboard bundle).
- [ ] Write ledger schema migrations via Flyway (accounts, and all tables
      needed by later phases as they land — this phase seeds the baseline).
- [ ] Write risk schema migrations via Alembic directly against Postgres:
      `risk_snapshots`, `price_history`, `pv_history`, `applied_events`
      (correct dialect: `GENERATED ALWAYS AS IDENTITY`, `TIMESTAMPTZ`,
      `NUMERIC` — no SQLite step, this is greenfield).
- [ ] Point `RiskStore` at `DATABASE_URL` from its first commit.
- [ ] Test Supavisor transaction-mode pooling against ledger-core's
      HikariCP/JDBC prepared-statement caching; disable caching if it
      misbehaves.
- [ ] Confirm the direct (unpooled) connection string is used only by
      Flyway and Alembic, never by application traffic.
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on every table as it is
      created, even before Phase 2's policies exist.
- [ ] Confirm the Supabase plan tier includes automated backups / PITR.
- [ ] Write `secrets.tf` pointing at Supabase credentials from the start.
- [ ] Confirm `rds.tf` never defines an RDS instance (greenfield — no
      removal step needed, just don't create it).
- [ ] Write `security.tf` without an RDS ingress rule.
- [ ] Write `user_data.sh.tftpl` against the Supabase connection model.
- [ ] Confirm `alb.tf`, `cloudfront.tf`, `elasticache.tf`, `ec2.tf`,
      `iam.tf`, `network.tf`, `cloudwatch.tf` are written independently of
      the database decision (no coupling to Postgres choice).
- [ ] Set `SPRING_DATASOURCE_URL` / `DATABASE_URL` to Supabase's pooled
      connection string.
- [ ] Resolve OD-1 and document the answer in BLUEPRINT.md.
- [ ] Confirm only ledger-core and risk-engine receive Postgres credentials.

**Verification checkpoint:** risk-engine restarts and its snapshots survive
the restart. `terraform plan` shows no RDS resource ever created (greenfield
equivalent of "only RDS being destroyed"). A direct psql connection via the
migration connection string succeeds; the pooled connection string against a
table with RLS enabled and no policies yet returns zero rows.

**Status:** not started — blocked on OD-1.

---

## Phase 1 — Auth cutover: Supabase Auth, JWKS, ownership scoping

**Depends on:** Phase 0 — needs the Supabase project and its Auth service to
exist before any service can verify against it.

**Task checklist:**
- [ ] Configure Supabase Auth as the sole identity provider (no interim
      hardcoded-user auth is ever built, since this is greenfield).
- [ ] ledger-core: implement `NimbusJwtDecoder.withJwkSetUri(...)` against
      Supabase's JWKS endpoint.
- [ ] risk-engine: add `PyJWT[crypto]` or `python-jose[cryptography]`, a
      cached `PyJWKClient`, wired as a FastAPI dependency on every route
      including `/risk/summary`, `/risk/var`, `/risk/explain`.
- [ ] gateway: add `github.com/lestrrat-go/jwx/v2`, middleware in front of
      `sseHandler`.
- [ ] Confirm all three services check signature, `exp`, and `aud`/`iss` —
      not just parseability.
- [ ] Implement account-ownership scoping: derive `account_id` from
      `jwt.sub` (`accounts.user_id = jwt.sub`) in every endpoint that reads
      or writes account data. No endpoint accepts a trusted client-supplied
      `account_id`.
- [ ] Dashboard: add `@supabase/supabase-js`; implement `AuthContext.jsx`
      around `supabase.auth.signInWithPassword()` and `onAuthStateChange`.
- [ ] Dashboard: implement `api/client.js`'s `authHeaders()` to pull from
      `supabase.auth.getSession()`.
- [ ] Confirm `/health` / `/healthz` are exempt from JWKS middleware on all
      services.
- [ ] Confirm no hardcoded-user auth path or dev JWT secret exists anywhere
      in the codebase (greenfield — nothing to delete, just confirm absence).

**Verification checkpoint:** a viewer-role token requesting another
account's `account_id` gets 403. A request to `/risk/var` with no
`Authorization` header gets 401. A tampered/expired JWT is rejected at all
three services independently; killing JWKS-endpoint network access mid-test
confirms each service fails closed.

**Status:** not started.

---

## Phase 2 — RBAC data model: roles, permissions, grants, claim hook, RLS

**Depends on:** Phase 1 — the claim hook has nothing to attach to without
Supabase Auth already issuing tokens.

**Task checklist:**
- [ ] Write DDL for `user_roles`, `accounts`, `account_grants`,
      `role_permissions` (roles: trader, viewer, delegated_viewer,
      compliance, risk_manager, admin, support, auditor; grants carry
      `purpose`, with `reason` required for support/delegated/auditor
      grants).
- [ ] Enforce the ownership-anchor rule everywhere: no endpoint accepts
      `account_id` as a trusted client parameter — always derived from
      `jwt.sub` or checked against `account_grants`.
- [ ] Seed the permission-string vocabulary: `orders.create`,
      `positions.read.own`, `positions.read.granted`, `positions.read.any`,
      `audit.read.any`, `compliance.rules.write`, `compliance.case.write`,
      `accounts.freeze`, `users.provision`, `risk.aggregate.read`,
      `ledger.adjustment.propose`, `ledger.adjustment.approve`.
- [ ] Write the Custom Access Token Hook (Postgres function): looks up
      `user_roles`, injects via `jsonb_set` under claim key `user_role`
      (never `role`), additive only. Grant execute to `supabase_auth_admin`.
      Enable under Dashboard → Authentication → Hooks.
- [ ] Write the `authorize()` security-definer function reading
      `auth.jwt() ->> 'user_role'` against `role_permissions`.
- [ ] Apply one RLS policy shape per table: self-owned OR
      granted-and-unexpired OR `authorize('...read.any')`.
- [ ] Confirm Trader/Viewer scope resolves identically at service layer and
      RLS (`accounts.user_id = jwt.sub`).
- [ ] Confirm Delegated Viewer resolves through `account_grants` with
      `expires_at > now()` checked on every access, not just at grant
      creation.

**Verification checkpoint:** a raw psql query as a non-privileged role
against another account's row is blocked by RLS even with the service-layer
check hypothetically bypassed. A signed-in test user's decoded JWT has
`user_role` present and `role` still Supabase-reserved. A Delegated Viewer
grant with a past `expires_at` is denied on the very next request.

**Status:** not started.

---

## Phase 3 — Orders + MARKET fills at the cached tick price

**Depends on:** Phase 1 specifically — an order needs to know whose account
it's placing against before compliance/fill logic exists; building execution
before ownership scoping would recreate the exact IDOR bug this plan exists
to prevent.

**Task checklist:**
- [ ] Design `LedgerService.postTrade` from the start as a single
      `@Transactional` write covering trade + journal + cash + audit +
      outbox — every later phase that touches trades (fees in Phase 6,
      orders here) posts inside this same transaction, never a separate one.
- [ ] Build a consumer-group scaffolding pattern (e.g.
      `stream/OutboxRelay.java` and a shared base consumer class) once, and
      reuse it for both `cg:ledger-core` (this phase) and `cg:risk-engine`
      (Phase 7) rather than inventing two styles.
- [ ] Implement `cg:ledger-core` consumer group on `market.ticks` with
      idempotent group creation (`XGROUP CREATE ... MKSTREAM`, tolerating
      `BUSYGROUP`).
- [ ] Build a live latest-price-per-symbol cache from consumed ticks.
- [ ] Build `OrderService`/`OrderController`,
      `OrderRequestDto`/`OrderResultDto`.
- [ ] Write migration `V6__orders.sql`: `orders` table with
      `status CHECK (... IN ('NEW','WORKING','FILLED','PARTIALLY_FILLED',
      'CANCELLED','REJECTED','EXPIRED'))`; `trades.order_id` FK.
- [ ] Implement MARKET fill logic: no tick ever seen for the symbol →
      `NO_MARKET`; tick older than `ledger.max-price-age-ms` →
      `STALE_PRICE`; otherwise fill at the cached price. No slippage in v1
      — documented explicitly in API docs.
- [ ] Dashboard: add `POST /orders` proxied path (nginx `/ledger/` block);
      build an Orders view rendering status as a pill, sourced from SSE.
- [ ] Adopt the `{code, message}` error shape platform-wide from this phase
      forward.

**Verification checkpoint:** submitting a MARKET order with a
client-supplied `price` field is ignored — fill matches the last real tick.
An order for a never-ticked symbol gets `NO_MARKET`. Killing the process
mid-fill leaves nothing partial.

**Status:** not started.

---

## Phase 4 — Notional position limits, long-only default

**Depends on:** Phase 3 — needs the cached-tick pricing infra to compute
notional against.

**Task checklist:**
- [ ] Resolve OD-2 (frozen-v1 status of `TradeResult.rejection_reason`)
      before writing this phase's rejection logic.
- [ ] Build `ComplianceRules.firstViolation`'s notional check:
      `notionalAfter = |positionAfter| × referencePrice` vs.
      `ledger.max-position-notional`, reusing Phase 3's cached tick price —
      no second price lookup.
- [ ] Add a pre-check before existing cash/position checks: SELL requires
      `currentPosition ≥ quantity` unless `accounts.margin_enabled = true`;
      new `INSUFFICIENT_POSITION` rejection reason.
- [ ] If `TradeResult.rejection_reason` is documented frozen-v1 per OD-2,
      handle the new rejection value via a version bump or documented
      exception — or prefer an order-specific rejection enum if one already
      exists, to sidestep the frozen file entirely.

**Verification checkpoint:** two accounts holding equal notional in a $2
stock vs. a $400 stock are treated identically; equal share counts of those
two are not. A SELL exceeding held quantity on a non-margin account is
rejected `INSUFFICIENT_POSITION`.

**Status:** not started.

---

## Phase 5 — Idempotency payload-hash check

**Depends on:** Phase 3 — nothing to hash until orders exist.

**Task checklist:**
- [ ] Compute SHA-256 over canonical (sorted-key) JSON of `account_id,
      symbol, side, order_type, quantity, limit_price` — excluding
      `request_id` and any timestamp.
- [ ] Store the hash as `trades.request_hash` (or a separate
      `idempotency_keys` table).
- [ ] Implement replay logic: repeated `request_id` with matching hash →
      cached result at original status; different hash → `409
      IDEMPOTENCY_KEY_REUSED`.
- [ ] Normalize `BigDecimal` scale before hashing so `"10.0"` vs `"10.00"`
      don't produce a false conflict.
- [ ] Implement dedup on the risk-engine side via `applied_events`/
      `event_id` for stream-delivery duplicates.

**Verification checkpoint:** replaying an identical `request_id` returns the
cached 200/201; replaying with one changed field under the same key returns
409. Replaying a Redis stream event twice (simulated `XAUTOCLAIM`
reclaim/duplicate delivery) produces exactly one effect, for both
ledger-core's `request_id` path and risk-engine's `applied_events`/
`event_id` path.

**Status:** not started.

---

## Phase 6 — Commission on fill

**Depends on:** Phase 3 — needs a fill to attach a fee to.

**Task checklist:**
- [ ] Add `ledger.commission-bps` config.
- [ ] Compute `fee = notional × rate`, rounded to `numeric(19,4)`.
- [ ] Post the fee as a balanced journal-line pair against a house fees
      account, inside the same transaction as the trade/journal/audit/
      outbox writes (per Phase 3's transaction design — no separate
      transaction).
- [ ] Confirm the `sum(debit) == sum(credit)` invariant holds per
      `journal_entry_id` after the fee is added.
- [ ] Confirm risk-engine's `portfolio_value = cash + market_value`
      reflects the fee once debited, without a duplicate subtraction
      anywhere in risk-engine's own logic.

**Verification checkpoint:** post-fill, cash debit = notional + fee, and the
fees account's credit exactly balances it.

**Status:** not started.

---

## Phase 7 — Risk math realism: per-symbol VaR, risk-free-rate Sharpe

**Depends on:** Phase 0 only — deliberately independent of Phases 3–6; can
run in parallel with them.

**Task checklist:**
- [ ] Build volatility/VaR/Sharpe computation from per-symbol return series
      in `price_history` (`r_t = (p_t − p_{t-1}) / p_{t-1}`), variance
      weighted by `(position_value / portfolio_value)²`, summed across
      positions — documented explicitly as a zero-correlation
      simplification (real covariance deferred to Phase 11).
- [ ] Implement `insufficient_history` flag for symbols with fewer than two
      price-history points, rather than a silent zero-risk value.
- [ ] Confirm the rolling-window config (used for both price cache and VaR
      input) is large enough to be statistically meaningful (20–30 points
      floor).
- [ ] Add configured `risk_free_rate_annual`, converted to the sampling
      period (`annual_rate × period_seconds / year_seconds` linear
      approximation, documented); defaults to 0 only if explicitly
      configured, never by omission.

**Verification checkpoint:** changing the recompute interval doesn't shift
VaR/volatility numbers (if it does, cadence and statistics are still
conflated). Using a fixed `price_history` fixture, VaR changes when the
instrument's own volatility changes.

**Status:** not started.

---

## Phase 8 — LIMIT orders, WORKING state

**Depends on:** both Phase 3 and Phase 4 — reuses their atomic-write-plus-
compliance machinery directly; building it earlier would mean a second,
divergent execution path.

**Task checklist:**
- [ ] On every tick, scan WORKING orders matching symbol where (BUY,
      `limit_price ≥ tick.price`) or (SELL, `limit_price ≤ tick.price`);
      fill at the limit price, never worse than specified.
- [ ] Add index `orders(symbol, status)` since this scan runs per tick.
- [ ] Add `expires_at` column plus a scheduled sweep (`@Scheduled`) marking
      past-due WORKING orders `EXPIRED`.

**Verification checkpoint:** a LIMIT below the current tick stays WORKING; a
crossing tick fills it through the same atomic path as MARKET, at the limit
price not the tick price.

**Status:** not started.

---

## Phase 9 — Extended roles and workflows

**Depends on:** Phase 2 — new scopes on existing role/grant machinery, not a
new auth mechanism.

**Task checklist:**
- [ ] Build `compliance_cases` table; open/close actions audit-logged like
      trades.
- [ ] Build the Risk Manager firm-wide aggregate as a live query/view
      (`SUM(quantity * price) GROUP BY symbol`); note that a materialized
      view is a later optimization, not required now.
- [ ] Confirm Support grants (`purpose = 'support'`) enforce Phase 2's
      `reason`-required constraint.
- [ ] Extend `account_grants` with `scope_start_date`/`scope_end_date` for
      Auditor, or build a separate `audit_engagements` table — do not reuse
      the current-state grant shape for date-range access.
- [ ] Create a private Supabase Storage bucket (`statements`), never
      public, with signed URLs or Storage RLS keyed to `auth.uid()`
      matching owning `user_id`.
- [ ] Use path convention `statements/{user_id}/{account_id}/{date}.pdf`.
- [ ] Confirm statement generation happens server-side in ledger-core only
      (never client-side).
- [ ] Define an explicit retention policy for statements (not indefinite).

**Verification checkpoint:** a Support grant expires on schedule with no
code deploy. A frozen account rejects new orders while still allowing
Compliance reads. An Auditor scoped to a date range reads inside it and not
outside it.

**Status:** not started.

---

## Phase 10 — SSE stream tickets, admin audit log, dual-control adjustments

**Depends on:** Phase 1 (JWKS verification must exist) and Phase 9
(dual-control assumes Phase 9's compliance-case/admin-action patterns).

**Task checklist:**
- [ ] Build SSE ticket issuance on ledger-core (owns the auth boundary): one
      authenticated REST call returns a short-lived, single-use stream
      ticket.
- [ ] Update the dashboard to open `EventSource` with the ticket as a query
      param, never a raw JWT.
- [ ] Build gateway middleware that validates tickets only (no parallel
      auth-minting on the Go side), reusing the Phase 1 JWKS cache in front
      of `sseHandler`.
- [ ] Build `ledger_adjustments` table with
      `CHECK (proposed_by <> approved_by)` — a real database constraint
      enforcing four-eyes review, not just application-layer trust.

**Verification checkpoint:** a stream ticket used twice is rejected the
second time. An Admin adjustment requires two distinct approving
identities; a self-approval attempt is rejected by the database constraint
even if the application layer somehow didn't catch it.

**Status:** done — all four checklist items built and live-verified; both checkpoints confirmed (ticket reuse rejected; self-approval rejected by both the service layer and, independently, the database CHECK via a raw SQL attempt). Committed as 31dbdeb.

---

## Phase 11 (deferred, explicitly out of initial scope)

**Depends on:** Phase 4 and Phase 7 already being solid.

**Task checklist (not to be started in this build):**
- [x] Confirm margin-enabled accounts and real short-selling rules remain
      undesigned/undeferred-only — a deliberate future feature with its own
      rule set (tighter notional limit, `margin_used` tracked separately
      from cash), not a side effect of an existing check.
- [x] Confirm correlation-aware VaR remains deferred, pending enough
      overlapping historical data to estimate covariance honestly.
- [x] Confirm a price-time-priority matching engine and multi-venue order
      routing remain excluded even after Phase 11 is eventually scoped.
- [x] Confirm each excluded item is visible as a comment/doc reference at
      the point the simpler approach was chosen (Phase 7's zero-correlation
      note, Phase 4's no-margin note), so it reads as "deferred, here's
      why," not a surprise.

**Verification checkpoint:** none — this phase is not implemented in the
initial build. The checkpoint is that its exclusion stays documented, not
silently dropped.

**Status:** audited — all four exclusions confirmed still deferred and documented at their point of decision (ComplianceRules/RejectionReason for margin, risk_calculator.py for correlation-aware VaR, Order.java's Status/fill() javadoc for the matching engine and multi-venue routing, strengthened this pass to explicitly reference Phase 11). No implementation started, as intended.

---

## Cross-cutting Integration Check (run once Phase 10 lands)

Not a phase — a final end-to-end verification that every phase's piece
actually fires together, in order:

1. Sign in (Phase 1) → `access_token` + `refresh_token` returned.
2. Bearer everywhere (Phase 1) on REST; `?ticket=<opaque>` on SSE
   (Phase 10) — never the raw JWT in a URL.
3. Verify (Phase 1): signature + `exp` + `aud`/`iss` at each service;
   failure → `401 unauthorized_token`.
4. Authorize (Phase 2): role + scope check; failure → `403 forbidden_scope`.
5. Order evaluated (Phase 3/4/8): MARKET fills at cached tick or rejects
   `NO_MARKET`/`STALE_PRICE`; LIMIT persists WORKING.
6. Compliance in notional terms (Phase 4), idempotency check (Phase 5),
   atomic write — trade, journal, fee line (Phase 6), audit row, outbox
   entry, one transaction.
7. Outbox relay → `ledger.updates`.
8. risk-engine drains `market.ticks` + `ledger.updates` (Phase 7), dedupes
   by `event_id`, recomputes from per-symbol history, persists a snapshot.
9. Publishes `risk.updates`.
10. gateway subscribes and fans out over the ticket-authenticated SSE
    connection (Phase 10).
11. Dashboard renders — filtered by role/scope, with RLS (Phase 2) as the
    backstop behind the service-layer check at every read.

**Status:** complete — all 11 steps verified live end-to-end (commits e7574ac, d217658, e651bc9).

---

## Phase 12 — Trader completeness

**Depends on:** Phase 1-11 (uses the existing auth/order/risk stack; no new
services).
**Task checklist:**
- [x] `POST /orders/{orderId}/cancel` (`order.cancel.own`) — only a WORKING
      order the caller owns is cancellable; anything else (already
      FILLED/REJECTED/CANCELLED, or someone else's order) rejects.
- [x] `GET /positions` (`position.read.own`) and `GET /trades`
      (`trade.read.own`) — direct reads, not inferred from `/orders`.
- [x] `GET /market/prices` (`market.read`) — exposes `PriceCache`'s current
      snapshot per symbol (age, price) instead of it staying
      diagnostics-only.
- [ ] Add `portfolio_value` to `risk_snapshots` (new column + persisted by
      `risk_recompute_service.py`, which already computes it for the VaR
      math but currently discards it) and return it from `GET /risk/me`.
- [ ] A `riskExplanation` field on `GET /risk/me` — plain-language,
      rule-based (e.g. "elevated volatility from a concentrated BTCUSD
      position"), not free-text generation; deterministic from the same
      numbers already computed, so it's testable.
- [ ] `GET /ledger/transactions` (own) — the underlying journal entries
      (trades, fees, adjustments), not just trades.
**Verification checkpoint:** a trader can fully self-serve (cancel, view
positions/trades/prices/portfolio value/risk explanation/transaction
history) without a single manual SQL query — the standard this whole
project has been falling back to all session.
**Status:** not started.

---

## Phase 13 — Viewer & granted-access reads

**Depends on:** Phase 12 (reuses its read endpoints' shape) and the
existing `account_grants` schema (V2/V8).
**Task checklist:**
- [ ] Viewer role reads its own data — same shape as Trader's reads
      (Phase 12) minus order creation, gated by `viewer`'s seeded
      permissions.
- [ ] Delegated Viewer / Support / Auditor granted-account reads:
      `GET /accounts/{accountId}`, positions, trades, orders, risk,
      statements — each checks `account_grants` (or, for auditor,
      `audit_engagements` — see Phase 16) fresh on every single request,
      never cached from an earlier check.
- [ ] Seed the missing granted-scope permissions in `role_permissions`
      (`account.read.granted`, `position.read.granted`,
      `trade.read.granted`, `order.read.granted`, `risk.read.granted`,
      `statement.read.granted`).
- [ ] Client-supplied `accountId` is never trusted for "is this granted to
      me" — always re-derived from `account_grants` server-side.
**Verification checkpoint:** an expired grant denies access on the very
next request (not just after some cache TTL); a valid grant reads
correctly; a grant for a different account never leaks the requested
one.
**Status:** not started.

---

## Phase 14 — Compliance: freeze and full visibility

**Depends on:** Phase 12/13's read patterns.
**Task checklist:**
- [ ] `POST /accounts/{accountId}/freeze` and `/unfreeze`
      (`accounts.freeze`, already seeded but unused by any endpoint).
- [ ] Confirm (with a real order attempt) a frozen account rejects new
      orders while Compliance can still read it in full — the "frozen
      ≠ invisible" rule from the spec.
- [ ] Seed and wire `trade.read.all` / `order.read.all` for compliance
      (currently only `positions.read.any` exists; trades/orders across
      the whole system aren't compliance-readable at all yet).
- [ ] Compliance-scoped risk read (`risk.read.all` or reuse an existing
      permission — decide and document which, same as V7's account-read
      permission-reuse decision).
- [ ] Compliance audit-history read (`audit.read.compliance`) — case
      opens/closes plus relevant account activity.
**Verification checkpoint:** freeze an account, confirm a new order from
that account is rejected while a GET on it still succeeds for Compliance;
confirm Compliance can see trades/orders belonging to accounts other than
their own.
**Status:** not started.

---

## Phase 15 — Support: temporary access enforcement

**Depends on:** Phase 13's granted-read pattern (Support reuses the same
`account_grants` shape, `purpose = 'support'`) and Phase 18 (Admin issues
the actual grant).
**Task checklist:**
- [ ] Support-scoped reads (account/orders/trades/positions) using the
      Phase 13 granted-access pattern.
- [ ] A live test proving the "no deployment needed to revoke" rule: issue
      a grant with a near-future `expires_at`, confirm access works, wait
      for it to pass, confirm the *very next* request is denied — no
      restart, no cache clear.
**Verification checkpoint:** the expiry test above, actually run against a
live grant, not just reasoned about.
**Status:** not started.

---

## Phase 16 — Auditor: full historical date-range access

**Depends on:** `audit_engagements` (V17), which currently has exactly one
working scoped policy (on `trades`).
**Task checklist:**
- [ ] Extend the `audit_engagements` date-range pattern from `trades` to:
      orders, positions/account activity, ledger entries (journal),
      compliance case history, and statements — five more resource types.
- [ ] Because ledger-core's own JDBC connection bypasses RLS entirely
      (same reasoning as V7/V9's comments), the date-range check must be
      enforced again in Java for every one of these reads, not assumed
      from the Postgres RLS policy alone.
- [ ] `POST /audit-engagements` so an engagement can actually be created
      via API (currently only possible by hand in SQL).
**Verification checkpoint:** for each of the five resource types, a date
just outside the engagement's range is denied and a date inside it is
allowed — run explicitly for all five, not just trades (which V17 already
covers).
**Status:** not started.

---

## Phase 17 — Risk Manager: firm-wide risk

**Depends on:** risk-engine's existing `risk_snapshots`/recompute
pipeline (Phase 7) and the `risk.updates` publish (this session).
**Task checklist:**
- [ ] `GET /risk/aggregate` (`risk.aggregate.read`, already seeded) —
      firm-wide exposure summed across all accounts.
- [ ] Exposure by account and exposure by symbol as separate, queryable
      breakdowns of the same aggregate.
- [ ] High-risk account identification — a threshold-based flag (document
      the threshold choice, same as every other "this cutoff was a
      deliberate choice" comment already in this codebase).
- [ ] Real-time firm-wide monitoring: a Risk Manager's SSE connection
      needs every account's `risk_update`, not just their own — this is
      a different filter rule in `gateway`'s `Streamer.Handle` than the
      per-`accountId` match built this session, keyed by role instead.
**Verification checkpoint:** the aggregate number equals the sum of the
individual account snapshots it's built from (checked against real data,
not just code review); a Risk Manager's SSE connection receives updates
for accounts that aren't their own.
**Status:** not started.

---

## Phase 18 — Admin: user, role, and grant management

**Depends on:** everything above that a grant/role change would otherwise
require manual SQL for.
**Task checklist:**
- [ ] User listing and role assignment/removal (`user.manag`,
      `role.manage` — not yet even seeded in `role_permissions`) —
      replacing every manual `INSERT INTO user_roles` this whole session
      has relied on.
- [ ] `account_grants` create/revoke (Delegated Viewer, Support) and
      `audit_engagements` create (Auditor) — Admin is the issuer per the
      spec ("Admin manages Support access, creates account grants"); the
      *read* side built in Phases 13/15/16 only ever consumes a grant,
      never creates one.
- [ ] Admin audit read (`audit.read.all`) — broader than Compliance's
      `audit.read.compliance` from Phase 14.
**Verification checkpoint:** grant a role, issue a Support grant with a
reason and expiry, and revoke a grant — all three via API calls, zero
manual SQL, in the same session that will then use Phase 15's test to
confirm the grant actually works and actually expires.
**Status:** not started.

---

## Phase 19 — Statements

**Depends on:** the existing `POST /accounts/{accountId}/statements`
(generation-only, already built).
**Task checklist:**
- [ ] `GET /accounts/{accountId}/statements` (list) and a download
      endpoint, scoped by role: own (Trader/Viewer), granted
      (Viewer/Support/Auditor via Phase 13/16), all (Admin), relevant
      (Compliance).
**Verification checkpoint:** each role sees exactly the statements its
scope allows — a trader never sees another account's, an admin sees
everything.
**Status:** not started.

---

## Phase 20 — Dashboard: a real UI for every role

**Depends on:** Phases 12-19 (each role's view is only as real as its
backend).
**Task checklist:**
- [ ] Replace the current plain-HTML-table look with an actual designed
      interface — layout, typography, color, real components — not just
      more tables.
- [ ] A distinct view per role: Trader (polish the existing Orders page),
      Viewer, Compliance, Risk Manager, Admin, Support, Auditor — each
      wired to its own phase's endpoints above, showing only what that
      role can see.
- [ ] Role-aware navigation — a user only ever sees entry points to
      views their own roles unlock.
**Verification checkpoint:** sign in as one test user per role, confirm
each sees only its own view and only the data its permissions allow —
this is the dashboard-side echo of every RLS/permission check built in
Phases 12-19.
**Status:** not started.
