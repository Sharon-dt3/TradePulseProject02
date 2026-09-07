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
- [x] Add `portfolio_value` to `risk_snapshots` (new column + persisted by
      `risk_recompute_service.py`, which already computes it for the VaR
      math but currently discards it) and return it from `GET /risk/me`.
- [x] A `riskExplanation` field on `GET /risk/me` — plain-language,
      rule-based (e.g. "elevated volatility from a concentrated BTCUSD
      position"), not free-text generation; deterministic from the same
      numbers already computed, so it's testable.
- [x] `GET /ledger/transactions` (own) — the underlying journal entries
      (trades, fees, adjustments), not just trades.
**Verification checkpoint:** a trader can fully self-serve (cancel, view
positions/trades/prices/portfolio value/risk explanation/transaction
history) without a single manual SQL query — the standard this whole
project has been falling back to all session.
**Status:** complete — all 6 items live-verified end-to-end (commits 0d74cc8, d07c65f, 2a0e81d, 3b4e9c0, 2e376a9).

---

## Phase 13 — Viewer & granted-access reads

**Depends on:** Phase 12 (reuses its read endpoints' shape) and the
existing `account_grants` schema (V2/V8).
**Task checklist:**
- [x] Viewer role reads its own data — same shape as Trader's reads
      (Phase 12) minus order creation, gated by `viewer`'s seeded
      permissions.
- [x] Delegated Viewer / Support granted-account reads:
      `GET /accounts/{accountId}`, positions, trades, orders — each
      checks `account_grants` fresh on every single request via
      AccountAccessService, never cached from an earlier check. Risk and
      statements deferred (risk-engine has no role/grant-checking
      mechanism yet; no statement list/download endpoint exists until
      Phase 19) - documented scope decision, same as Phase 12 item 4/5.
      Auditor deliberately excluded - its granted access uses
      `audit_engagements`' date-range model instead (Phase 16), not
      `account_grants`.
- [x] Seed the missing granted-scope permissions in `role_permissions`
      (`account.read.granted`, `trades.read.granted`,
      `orders.read.granted` - `positions.read.granted` was already
      seeded in V3). Named with the codebase's established plural
      vocabulary rather than the planning doc's singular wording (V26).
- [x] Client-supplied `accountId` is never trusted for "is this granted to
      me" — AccountAccessService always re-derives ownership/grant
      status from the database by construction, never assumes.
**Verification checkpoint:** an expired grant denies access on the very
next request (not just after some cache TTL); a valid grant reads
correctly; a grant for a different account never leaks the requested
one.
**Status:** complete — all 4 items live-verified end-to-end (commits
72c2c51, 3960827).

---

## Phase 14 — Compliance: freeze and full visibility

**Depends on:** Phase 12/13's read patterns.
**Task checklist:**
- [x] `POST /accounts/{accountId}/freeze` and `/unfreeze`
      (`accounts.freeze`, already seeded but unused by any endpoint).
      New `Account.freeze()`/`unfreeze()` domain methods, a new
      `AccountFreezeService` (reuses AccountRepository.findById, no
      ownership check - any account, freeze or unfreeze, mandatory
      `reason`, audit-logged as ACCOUNT_FROZEN/ACCOUNT_UNFROZEN
      regardless of whether the flag actually changed). No new
      migration - accounts.freeze was already seeded to
      compliance+admin. Live-verified: freeze -> frozen:true on
      read, blank reason -> 400, unknown account -> 404, unfreeze ->
      frozen:false on read. (commit d2a62bd)
- [x] Confirm (with a real order attempt) a frozen account rejects new
      orders while Compliance can still read it in full — the "frozen
      ≠ invisible" rule from the spec. Verification only - the
      rejection logic (OrderServiceImpl.resolveOrder,
      RejectionReason.ACCOUNT_FROZEN) already existed from Phase 9 and
      needed no changes. Live-verified: froze testtrader's own account
      (compliance role), placed a MARKET order as the same user -
      rejected with ACCOUNT_FROZEN (still HTTP 201, rejection is a
      successful-request outcome per RejectionReason's contract);
      unfroze, replayed the identical order - it proceeded past the
      freeze check (came back NO_MARKET instead, an unrelated
      rejection since no live tick existed for the symbol at test
      time), confirming freeze itself - not something else - was the
      blocker.
- [x] Seed and wire an "any"-tier read for compliance across
      account/positions/trades/orders (plan originally said
      `trade.read.all`/`order.read.all`; built as `trades.read.any`/
      `orders.read.any`/`account.read.any` instead, matching the
      plural-resource + scope-suffix convention already established by
      `*.read.own`/`*.read.granted` and by the existing dormant
      `positions.read.any`). `AccountAccessService.resolveReadableAccount`
      gained a 6-arg overload taking an optional anyPermission, checked
      first and short-circuiting the own/granted resolution entirely when
      held - wired into AccountServiceImpl, PortfolioServiceImpl
      (positions + trades), OrderServiceImpl. New migration
      V29__compliance_any_read_permissions.sql seeds account.read.any/
      trades.read.any/orders.read.any to compliance; positions.read.any
      already existed (V3) and just needed wiring. Live-verified: all
      four endpoints (account, positions, trades, orders) return 200 for
      an account the compliance caller neither owns nor holds a grant
      for - before this item, the same calls threw ACCOUNT_NOT_FOUND
      (404).
- [x] Compliance-scoped risk read (`risk.read.all` or reuse an existing
      permission — decide and document which, same as V7's account-read
      permission-reuse decision). Decided to reuse `risk.aggregate.read`
      (V3, previously held only by risk_manager+admin) rather than add a
      new permission - GET /risk/aggregate already gates on that single
      permission with no other code involved, so this was a one-line
      migration (V30__compliance_risk_aggregate_permission.sql), no
      risk-engine code changes. Live-verified: compliance token against
      /risk/aggregate now returns 200 with real firm-wide data.
- [x] Compliance audit-history read (`audit.read.compliance`) — case
      opens/closes plus relevant account activity. Decided NOT to add a
      new permission: compliance already held the broader `audit.read.any`
      from V3 (seeded alongside admin/auditor), so AuditReadService
      already accepted a compliance caller - the only gap was that
      compliance had no endpoint of its own and would've had to know to
      call /admin/audit-log. Added a role-neutral URL alias,
      `GET /compliance/audit-log` (new ComplianceAuditLogController,
      reuses AuditReadService as-is), purely an API-naming correction.
      Live-verified: unfiltered list, entityType=account filter narrows
      correctly to 5 matching rows (including this phase's own
      freeze/unfreeze/statement audit entries), entityType=ACCOUNT
      (wrong case) correctly returns empty (case-sensitive exact match,
      not a bug).
**Verification checkpoint:** freeze an account, confirm a new order from
that account is rejected while a GET on it still succeeds for Compliance;
confirm Compliance can see trades/orders belonging to accounts other than
their own. Both done live: froze testtrader's own account (dual
trader+compliance role), a MARKET order came back ACCOUNT_FROZEN (HTTP
201, not a 4xx - rejection is a successful-request outcome); after
unfreezing, account/positions/trades/orders reads on testviewer's
account (owned by neither testtrader nor granted to them) all returned
200 via the new any-tier, where they'd have been 404 before item 3.
**Status:** complete — all 5 items live-verified end-to-end
(commits d2a62bd, 8e8f6c3, and this phase's final items 4-5 commit).

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
- [x] `GET /risk/aggregate` (`risk.aggregate.read`, already seeded) —
      firm-wide `totalPortfolioValue`, summed from every account's
      latest `risk_snapshots` row. New `permission_service.py` in
      risk-engine (a Python mirror of ledger-core's PermissionService —
      risk-engine had no authorization machinery before this).
- [x] Exposure by account (`byAccount`: each account's own
      portfolioValue/var95/volatility) and exposure by symbol
      (`bySymbol`: net position firm-wide, valued at latest price —
      deliberately net not gross, consistent with
      positions_repository's existing per-account netting convention).
- [x] High-risk account identification — `var_95` exceeding a
      configurable percentage of that account's own `portfolio_value`
      (`risk_high_risk_var_threshold_pct`, default 10%), not a flat
      dollar figure, so accounts of different sizes are held to the
      same proportional standard.
- [x] Real-time firm-wide monitoring — SSE tickets now carry
      `firmWideRisk`, computed at mint time from the caller's
      `risk.aggregate.read` permission (never client-asserted).
      `gateway`'s `Streamer.Handle` skips the per-`accountId` match
      entirely for a `firmWideRisk` connection, keyed off the same
      permission `GET /risk/aggregate` is gated by.
**Verification checkpoint:** `totalPortfolioValue` confirmed equal to
the sum of `byAccount` entries; `bySymbol` notional arithmetic checked
exactly; the `role_permissions` query confirmed `false` for
trader/viewer (no live non-admin token available this session, verified
at the SQL level instead of a live 403); a firm-wide SSE connection
confirmed receiving a `risk_update` for an account that isn't its own
(synthetic event published directly to `risk.updates`, since no second
account's live trade activity was available this session).
**Status:** complete — all 4 items live-verified end-to-end across all
three services (commits d108a66, d51183d).

---

## Phase 18 — Admin: user, role, and grant management

**Depends on:** everything above that a grant/role change would otherwise
require manual SQL for.
**Task checklist:**
- [x] User listing and role assignment/removal (`user.read.all`,
      `role.manage`, seeded in V27) — `GET /admin/users` (with each
      user's roles), `POST/DELETE /admin/users/{userId}/roles/{role}` —
      replacing every manual `INSERT INTO user_roles` this whole session
      has relied on. Live-verified: list with correct per-user roles,
      assign (201), duplicate assign (409 ROLE_ALREADY_ASSIGNED), invalid
      role (400 INVALID_ROLE), remove (204), remove-again
      (404 ROLE_NOT_ASSIGNED). `removeRole` needed `@Transactional` for
      its derived `deleteByUserIdAndRole` call — without it, Spring's
      find-then-`remove()` had no active EntityManager transaction and
      threw `TransactionRequiredException` (500) on every delete.
      (commit 1eae853)
- [x] `account_grants` create/revoke (Delegated Viewer, Support) and
      `audit_engagements` create (Auditor) — Admin is the issuer per the
      spec ("Admin manages Support access, creates account grants"); the
      *read* side built in Phases 13/15/16 only ever consumes a grant,
      never creates one. `POST/DELETE /admin/accounts/{accountId}/grants`
      (+`/admin/grants/{grantId}`) and
      `POST /admin/accounts/{accountId}/audit-engagements`, gated by two
      new permissions (`account.grant.manage`, `audit.engagement.manage`,
      V28). `auditor` is rejected as a grant purpose even though the DB
      CHECK allows it — Auditor access is audit_engagements' bounded
      date range instead. Revoke reuses Phase 13's existing
      "expires_at checked fresh on every read" rule (no separate
      revoked flag) — AccountGrant.revoke() just pulls expiresAt to
      now. Live-verified: issue (201), invalid purpose (400), missing
      account/user (404 each), past expiresAt (400), revoke (204),
      revoke-nonexistent (404); engagement create (201), invalid date
      range (400), missing account/user (404 each). (commit b1dcefc)
- [x] Admin audit read (`GET /admin/audit-log`, optional
      `entityType` filter, 200 most recent rows) — reuses `audit.read.any`
      (already seeded to admin/compliance/auditor back in V3, no new
      migration needed). Deliberately the unrestricted, all-entries
      view; Compliance's own narrower scope is still Phase 14's to add.
      Live-verified: unfiltered list, entityType filter narrows
      correctly, non-matching filter -> empty array (200).
      (commit a0fbc15)
**Verification checkpoint:** grant a role, issue a Support grant with a
reason and expiry, and revoke a grant — all three via API calls, zero
manual SQL, in the same session that will then use Phase 15's test to
confirm the grant actually works and actually expires.
**Status:** complete — all 3 items live-verified end-to-end
(commits 1eae853, b1dcefc, a0fbc15).

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
backend). This pass covers Viewer(13)/Admin(18)/Risk Manager(17)/
Compliance(14)/Trader-polish — the phases actually built. Support(15),
Auditor(16), and Statements(19) views are deferred until those backends
exist; the nav/shell below is built so adding them later is just a new
route + nav entry, not a rearchitecture.

### Phase 20.0 — Backend prerequisites (found while planning the UI)

Two real gaps surfaced: Admin held `accounts.freeze` (can freeze blindly
by ID) but never `account.read.any` (only compliance got that in Phase
14 item 3), so an Admin screen showing account details before acting on
one would 404; and there was no account directory anywhere - Admin/
Compliance would need a UUID handed to them out of band to look
anything up, and `account.grant.manage`'s revoke had no way to discover
a `grantId` either. Fixed as three small, convention-following additions
(no new permissions beyond one reuse):
- [x] `V31__admin_account_read_any_permission.sql` - seeds
      `account.read.any` to admin.
- [x] `GET /accounts` - the account directory (new `AccountSummaryDto`:
      accountId, ownerUserId, ownerEmail, cashBalance, marginEnabled,
      frozen), gated on `account.read.any` - the exact permission the
      any-tier already checks, not a new one.
- [x] `GET /admin/accounts/{accountId}/grants` - lists grants for an
      account, gated on the existing `account.grant.manage` (same
      permission issue/revoke already use).
**Status:** complete — live-verified: compliance's GET /accounts
returns all 3 accounts with owner emails joined correctly; admin token
(new admin.test@tradepulse.internal, admin role) confirmed on all
three - directory (200), GET /accounts/{accountId} for an account admin
doesn't own (200, previously would have 404 before V31), and grants-list
(200, showing 4 historical grants from Phase 13 testing).

### Phase 20.1 — Foundation

- [x] Install Tailwind CSS (`tailwindcss @tailwindcss/postcss postcss`),
      wire into `postcss.config.mjs`, replace `globals.css` with a
      `@import "tailwindcss"` + design tokens (`@theme` block: color
      palette, font stack, radii, shadows) - no `tailwind.config.js`
      needed under Tailwind v4's CSS-first config.
- [x] Design tokens: a small neutral/slate base palette plus one accent
      per semantic meaning (not per role) - success/green for
      FILLED/live, warning/amber for pending/rejected-benign, danger/red
      for frozen/rejected-hard, info/blue for links/live-indicators.
      Dark-mode aware via `prefers-color-scheme` from the start, since
      every other artifact in this session has been.
- [x] Shared component library under `src/components/ui/`: `Button`,
      `Card`, `Badge` (status pills - FILLED/REJECTED/frozen/live),
      `DataTable` (sortable columns, empty state, loading skeleton),
      `FormField` (label+input+error, used by every form in every role),
      `Modal` (freeze/unfreeze reason prompts, grant-issue form, role
      picker), `Toast`/inline `Alert` (replaces today's raw `{error &&
      <p style={{color:'red'}}>}`), `LiveDot` (the existing
      `● live`/`○ connecting...` indicator, componentized), `PageHeader`
      (title + breadcrumb + primary action slot).
- [x] `src/lib/api/client.js`: generalize beyond `ledgerCoreFetch` -
      add `riskEngineFetch` (base URL `NEXT_PUBLIC_RISK_ENGINE_URL`,
      same auth-header/error-shape handling) since Risk Manager and the
      live-risk panel both need risk-engine directly, not just
      ledger-core.
- [x] `AuthContext`: currently exposes only `session`/`user` - add
      `roles` (decoded from the JWT's `user_role` claim,
      `session.access_token` split/base64-decoded, no extra network
      call) since every role-gated nav item and page guard needs this
      and nothing today reads it.
- [x] `src/components/RequireRole.jsx`: wraps a page, redirects to `/`
      (or a 403 screen) if the signed-in user's `roles` doesn't include
      at least one of the page's required roles - the client-side echo
      of every backend permission check, not a replacement for it (the
      backend still 403s regardless; this just avoids showing a page
      that will only error).
- [x] App shell (`src/app/layout.js` + a new `src/components/AppShell.jsx`):
      persistent sidebar nav (role-aware - only renders links for roles
      the user holds), top bar (signed-in email, sign-out), main content
      area. Replaces the current bare `{children}` layout.
- [x] Route structure: `/trader`, `/viewer`, `/admin`, `/risk`,
      `/compliance` as top-level route segments (existing `/orders`
      becomes `/trader`, redirected for compatibility). `/` becomes a
      landing/sign-in page that, once authenticated, redirects to the
      first role-appropriate route rather than showing a raw JSON debug
      dump (today's `authHeaders()` button/`<pre>` dump is dev-only
      scaffolding, gets removed).
**Verification checkpoint:** `npm run dev` renders the shell with
correct light/dark tokens and no console errors; sign in as
`testtrader@gmail.com` (trader+compliance) and confirm the nav shows
exactly Trader + Compliance links, nothing else.
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.

### Phase 20.2 — Viewer view (`/viewer`)

Endpoints: `GET /accounts/me` (own account summary); `GET /positions`,
`GET /trades`, `GET /orders` (own, bare paths) as the default view; a
"switch account" field for granted access, hitting
`GET /accounts/{accountId}`, `/accounts/{accountId}/positions`,
`/trades`, `/orders` instead once an accountId is entered. **Known
limitation, called out in the UI, not hidden:** there is no
self-service "list accounts granted to me" endpoint yet (Phase 13/15
never built one), so a Viewer with delegated access needs to be told
the accountId out of band - a manual input field with a clear caption,
not a silent dead end.
- [x] Account summary card: cash balance, margin-enabled badge, frozen
      banner (red, prominent - "This account is frozen" - if
      `frozen:true`, since Viewer can still read a frozen account, just
      not trade it).
- [x] Tabs: Positions / Trades / Orders, each a `DataTable` off the
      corresponding endpoint.
- [x] Account-switch input + validation (invalid/unauthorized accountId
      surfaces the backend's exact `ACCOUNT_NOT_FOUND` message via
      `Alert`, not a generic failure).
**Verification checkpoint:** sign in as a viewer-role test user, confirm
own-account tabs populate; if a grant exists from earlier phases, switch
to the granted account and confirm the same tabs now show its data;
switch to a random UUID and confirm a clean "not found" message, not a
crash.
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.

### Phase 20.3 — Admin view (`/admin`)

Endpoints: `GET /accounts` (directory, NEW), `GET /accounts/{accountId}`
(any-tier, NEW as of V31), `GET /admin/users`,
`POST`/`DELETE /admin/users/{userId}/roles/{role}`,
`POST /admin/accounts/{accountId}/grants`, `DELETE /admin/grants/{grantId}`,
`GET /admin/accounts/{accountId}/grants` (NEW),
`POST /admin/accounts/{accountId}/audit-engagements`,
`GET /admin/audit-log`, `POST /accounts/{accountId}/freeze`/`/unfreeze`.
- [x] Sub-nav within `/admin`: Users / Accounts / Audit Log.
- [x] **Users tab:** `DataTable` off `GET /admin/users` (email, role
      badges); each row expands to add/remove-role controls (`Modal`
      with a role `<select>` from the 8 valid roles, calling
      `POST`/`DELETE .../roles/{role}`).
- [x] **Accounts tab:** `DataTable` off `GET /accounts` (owner email,
      balance, frozen badge); row actions: Freeze/Unfreeze (`Modal`
      prompting for the mandatory reason, calling
      `POST .../freeze`/`/unfreeze`), View (drill into a detail panel
      showing positions/trades/orders via the any-tier reads, plus a
      Grants sub-panel: list via `GET .../grants`, issue via a form
      (userId picked from the Users tab's data, purpose select limited
      to `delegated_viewer`/`support`, reason, expiry date-time picker),
      revoke via a button per row calling `DELETE /admin/grants/{grantId}`),
      and an audit-engagement form (auditor userId, reason, date range)
      calling `POST .../audit-engagements`.
- [x] **Audit Log tab:** `DataTable` off `GET /admin/audit-log`, an
      `entityType` filter `<select>` (populated from the distinct
      values already seen in the loaded page, e.g. account/order/trade/
      LEDGER_ADJUSTMENT/compliance_case - a live echo of the
      inconsistent casing convention already in the data, not something
      to paper over), each row's `details` JSON shown in a expandable
      `<pre>` rather than a raw inline dump.
**Verification checkpoint:** sign in as `phase10admin2@gmail.com` (or
reset its password first), confirm all three tabs populate; freeze a
test account through the UI and confirm the Accounts tab's badge
updates; issue a grant through the UI and confirm it appears in that
account's Grants sub-panel, then revoke it and confirm it disappears
(or shows revoked/expired).
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.

### Phase 20.4 — Risk Manager view (`/risk`)

Endpoints: `GET /risk/aggregate` (risk-engine) - the entire view;
`risk_manager` holds no other permission, so there's no drill-down
endpoint to wire beyond what this one response already contains
(`byAccount` already includes per-account portfolioValue/var95/
volatility/highRisk). Live updates via the existing SSE mechanism
(`POST /stream/tickets` -> `firmWideRisk:true` for a caller holding
`risk.aggregate.read` -> gateway forwards every account's
`risk_update`, not just the caller's own).
- [x] Summary cards: totalPortfolioValue, accountCount,
      highRiskAccountCount, highRiskThresholdPct.
- [x] `byAccount` `DataTable`, `highRisk` accounts visually flagged
      (danger `Badge`), sortable by var95/portfolioValue.
- [x] `bySymbol` `DataTable`: netQuantity/latestPrice/notionalValue.
- [x] Live indicator (`LiveDot`) wired to the firm-wide SSE stream -
      on a `risk_update` event for any account, patch that row in the
      `byAccount` table in place (no full re-poll) and flash-highlight
      it briefly so a Risk Manager watching the screen actually notices
      a live change, not just a static-feeling number swap.
**Verification checkpoint:** sign in as a risk_manager-role test user,
confirm the aggregate loads; trigger a trade from another session/tab
and confirm the corresponding row updates live without a page refresh.
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.

### Phase 20.5 — Compliance view (`/compliance`)

Endpoints: `GET /accounts` (directory), `GET /accounts/{accountId}` +
`/positions` + `/trades` + `/orders` (any-tier), `POST .../freeze`/
`/unfreeze`, `GET /compliance/cases`, `POST /compliance/cases`,
`POST /compliance/cases/{caseId}/close`, `GET /compliance/audit-log`,
`GET /risk/aggregate` (risk-engine).
- [x] Sub-nav: Accounts / Cases / Audit Log / Risk.
- [x] **Accounts tab:** shares the same directory `DataTable` +
      freeze/unfreeze + detail-drill component built for Admin's
      Accounts tab (same underlying permission tier, same UI - built
      once as a shared component, used by both role views rather than
      duplicated).
- [x] **Cases tab:** open-case form (accountId, reason) ->
      `POST /compliance/cases`; `DataTable` off `GET /compliance/cases`
      (needs an accountId query param per the existing controller - a
      per-account view, entered via the same account picker as the
      Accounts tab); close-case button per open row ->
      `POST .../cases/{caseId}/close`.
- [x] **Audit Log tab:** identical `DataTable`/filter UI to Admin's,
      pointed at `GET /compliance/audit-log` instead of
      `/admin/audit-log` (same shared component, different endpoint
      prop - this is exactly the role-neutral-alias decision from Phase
      14 item 5 paying off in the frontend).
- [x] **Risk tab:** the same aggregate view built for Risk Manager
      (shared component), confirming item 4's permission reuse end to
      end in the UI too.
**Verification checkpoint:** sign in as `testtrader@gmail.com`
(trader+compliance), confirm the Compliance nav item appears alongside
Trader; freeze/read/case-open/audit-log/risk all work from this view
without needing SQL or curl.
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.

### Phase 20.6 — Trader polish (`/trader`)

The existing Orders page, rebuilt on the Phase 20.1 component library
rather than inline styles - no new endpoints, same wiring
(`GET`/`POST /orders`, `POST /orders/{orderId}/cancel` - cancel isn't
in the UI today, add it), `GET /positions`, `GET /trades` (also missing
today - the page only ever showed orders), `GET /accounts/me` (account
summary card, including the frozen banner from 20.2 - a frozen trader
should see clearly why their orders are being rejected, not just a
cryptic `ACCOUNT_FROZEN` string in a table cell), live risk panel kept
as-is functionally but rebuilt with `Card`/`Badge`/`LiveDot`.
- [x] Positions and Trades tabs added alongside Orders (currently
      missing entirely from the trader's own view, despite the
      endpoints existing since early phases).
- [x] Cancel button on working (non-terminal) orders ->
      `POST /orders/{orderId}/cancel`.
- [x] Account summary card + frozen banner (shared component from
      20.2/20.3).
**Verification checkpoint:** place, view, and cancel an order through
the rebuilt UI; freeze the trader's own account via another role's
view (or curl) and confirm the frozen banner appears and a new order
attempt shows a clear "account frozen" message, not a raw
`rejectionReason: "ACCOUNT_FROZEN"` table cell.
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.

### Phase 20.7 — Cross-cutting polish

- [x] Loading/error states standardized across every view (skeleton
      rows in `DataTable`, `Alert` for errors) - no more bare
      `<p>Loading...</p>`.
- [x] Responsive down to a reasonable tablet width (this is an
      internal ops tool, not consumer-mobile-first, but the sidebar
      should collapse rather than overflow).
- [x] Remove the root page's dev-only `authHeaders()`/`<pre>` debug
      dump.
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.

**Overall verification checkpoint:** sign in as one test user per role
(trader, viewer, compliance, risk_manager, admin - reusing
`testtrader@gmail.com`'s dual trader+compliance role covers two at
once), confirm each sees only its own nav entries and only the data its
permissions allow - the dashboard-side echo of every RLS/permission
check built in Phases 12-19.
**Status:** built (all checklist items implemented directly, per Sharon's instruction to build without pausing to ask) — not yet run or live-verified, since this session has no execution access to Sharon's Mac. Needs `npm run dev` + a pass through each role once the two CORS fixes below are also restarted.
