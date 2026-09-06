# ledger-core API

Endpoints exposed by ledger-core. See BLUEPRINT.md for the system-wide
security model and IMPLEMENTATION_PLAN.md for which phase built each
endpoint. This file documents the HTTP contract only — request/response
shapes and error behavior — not the internal service-layer design (that's
covered by javadoc on OrderService/LedgerService/AccountService).

All endpoints require a valid Supabase-issued Bearer JWT except
`/actuator/health`. `account_id` is never accepted as a request
parameter anywhere in this API — every endpoint derives it from the
caller's `jwt.sub`, per BLUEPRINT.md §4's ownership-scoping rule.

---

## Error shape

Every error response from Phase 3 onward uses this shape:

```json
{ "code": "ACCOUNT_NOT_FOUND", "message": "No account found for user <uuid>" }
```

This does **not** apply to a rejected order (see below) — a rejected
order is a successful `201` response, not an error.

| HTTP status | code | When |
|---|---|---|
| 404 | `ACCOUNT_NOT_FOUND` | The caller's `jwt.sub` has no matching `accounts` row |

---

## `GET /accounts/me`

Returns the account belonging to the caller.

**Response `200`:**
```json
{
  "accountId": "uuid",
  "cashBalance": 10000.0000,
  "marginEnabled": false,
  "frozen": false
}
```

**Response `404`:** no body (pre-dates the `{code, message}` shape —
this endpoint was built before Phase 3 adopted it; not retrofitted).

---

## `POST /orders`

Places a MARKET order for the caller's own account. As of Phase 3, only
`orderType: "MARKET"` exists — anything else is rejected by Jackson at
deserialization (`400`) since `Order.OrderType` only declares one value.

**Request:**
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "MARKET",
  "quantity": 10
}
```

| Field | Notes |
|---|---|
| `symbol` | required, non-blank |
| `side` | `BUY` or `SELL` |
| `orderType` | `MARKET` only (v1) |
| `quantity` | required, must be > 0 |

There is **no `price` field** — a MARKET order cannot specify or
influence its own fill price. This is enforced by the contract itself,
not by application logic discarding an extra field: `OrderRequestDto`
has nowhere to put one.

**Response `201` — filled:**
```json
{
  "orderId": "uuid",
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "MARKET",
  "quantity": 10,
  "status": "FILLED",
  "rejectionReason": null,
  "fillPrice": 189.32,
  "executedAt": "2026-09-06T10:56:27.225032+05:30"
}
```

`fillPrice` is always the most recent price `PriceCache` has observed
for `symbol` at the moment the order is evaluated — **there is no
slippage model in v1.** The order fills at exactly that cached price or
it doesn't fill at all (see rejection reasons below); there is no
partial fill, no worse-than-quoted execution, and no mechanism for a
client to request or expect a different price.

**Response `201` — rejected:**
```json
{
  "orderId": "uuid",
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "MARKET",
  "quantity": 10,
  "status": "REJECTED",
  "rejectionReason": "NO_MARKET",
  "fillPrice": null,
  "executedAt": null
}
```

A rejected order is still a `201` — the request was valid and was
processed; it just didn't result in a fill. This is deliberately
different from the `{code, message}` error shape above, which is
reserved for requests that couldn't be processed at all (see
`RejectionReason`'s javadoc for the reasoning).

`rejectionReason` values (Phase 3):

| Value | Meaning |
|---|---|
| `NO_MARKET` | No tick has ever been observed for this symbol |
| `STALE_PRICE` | A tick exists, but it's older than `ledger.max-price-age-ms` (default 5000ms) |
| `INSUFFICIENT_POSITION` | A SELL would take a non-margin account's position below zero |
| `NOTIONAL_LIMIT_EXCEEDED` | The order would increase the account's notional exposure in this symbol beyond `ledger.max-position-notional` (default $50,000) — only checked when the order *increases* exposure; de-risking trades are never blocked by this |

`rejectionReason` is **not** declared frozen-v1 yet (BLUEPRINT.md §7
OD-2 is still open) — later phases (e.g. Phase 4's
`INSUFFICIENT_POSITION`) are expected to add values here.

---

## `GET /orders`

Every order the caller's account has ever placed, newest first — no
pagination yet.

**Response `200`:**
```json
[
  {
    "orderId": "uuid",
    "symbol": "BTCUSD",
    "side": "BUY",
    "orderType": "MARKET",
    "quantity": 0.01,
    "status": "FILLED",
    "rejectionReason": null,
    "fillPrice": 79837.27,
    "executedAt": "2026-09-06T10:56:27.225032+05:30"
  },
  {
    "orderId": "uuid",
    "symbol": "AAPL",
    "side": "BUY",
    "orderType": "MARKET",
    "quantity": 10,
    "status": "REJECTED",
    "rejectionReason": "NO_MARKET",
    "fillPrice": null,
    "executedAt": null
  }
]
```

Same `OrderResultDto` shape as `POST /orders`'s response — a past
order's outcome is reconstructed from the `orders` row itself
(`rejectionReason` is persisted there as of
`V12__orders_rejection_reason.sql`) plus its `Trade` when filled, so
there's exactly one response shape for "an order's outcome," whether
it's being reported live or read back later.