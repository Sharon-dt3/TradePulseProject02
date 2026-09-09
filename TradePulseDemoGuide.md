# TradePulse 8-Slide Role and Order Demo Guide

## Purpose

Use this concise presentation to demonstrate how TradePulse connects informed trading, controlled execution, auditable records, and independent oversight. Use BTCUSD for the live example because its Coinbase quote feed is continuously available.

## Presenter preparation

Before presenting:

1. Prepare accounts for the Trader, Viewer, Risk Manager, Compliance, and Admin roles.
2. Use a Trader account with available cash and, if demonstrating a sell, at least `0.001` BTCUSD.
3. Confirm BTCUSD has a fresh quote.
4. Use a small quantity such as `0.001` BTCUSD.
5. Do not depend on equity fills during the demo; they require the Finnhub feed and active U.S. market activity.

---

## Slide 1 — TradePulse at a glance

**Show:** The sign-in screen and role selector.

**Key message:** TradePulse is a role-based trading platform that connects market context, portfolio management, orders, risk oversight, compliance, and administration.

**Suggested narration:**

> “TradePulse keeps each responsibility in the right workspace. Traders make informed orders, while risk, compliance, viewers, and administrators receive only the access needed for their role.”

---

## Slide 2 — Role-based access

**Show:** The role choices, then sign in as Trader.

**Key message:** The selected role determines permitted workspaces and actions, not merely which navigation items are visible.

**Suggested narration:**

> “A Trader works with orders and positions. A Viewer is read-only. Risk Manager, Compliance, and Admin roles each have independent responsibilities. This separation supports least-privilege access and avoids combining trading authority with oversight.”

**Roles to mention:**

- **Trader:** Places and manages supported orders.
- **Viewer:** Reviews permitted account information without trading authority.
- **Risk Manager:** Evaluates firm-wide exposure and risk indicators.
- **Compliance:** Reviews cases and audit information.
- **Admin:** Manages users, role assignments, and authorized account-access functions.

---

## Slide 3 — Portfolio and market context

**Show:** The Trader overview, Portfolio command center, and Market Pulse.

**Key message:** Before acting, a trader can review cash, quoted holdings, open orders, live quotes, and risk context.

**Suggested narration:**

> “Portfolio value combines cash with holdings that have usable current quotes. Market Pulse displays the quotes the platform has actually received. BTCUSD is a reliable demo symbol because it uses the continuously available Coinbase feed.”

**Clarifications:**

- Allocation is based on **quoted holdings**, not cash.
- A 100% BTCUSD allocation means it is the entire value of currently quoted holdings; it does not mean the account has no cash.
- Browser price observations are short-lived and are not a complete historical chart.

---

## Slide 4 — Risk analysis

**Show:** Live risk analysis on the Trader overview.

**Key message:** Risk metrics provide decision context, while server-side controls enforce order and account rules.

**Suggested narration:**

> “Risk analysis helps a trader understand concentration, volatility, Value at Risk, and Expected Shortfall. These are advisory estimates based on available data. They do not guarantee outcomes or automatically approve an order.”

**Plain-language definitions:**

- **Concentration:** How much of the portfolio is exposed to one asset.
- **VaR:** An estimated loss threshold at a chosen confidence level.
- **Expected Shortfall:** The average loss among outcomes worse than the VaR threshold.
- **Volatility:** The observed size of price or return changes.

---

## Slide 5 — Small market order

**Show:** The Place order workflow.

**Use these sample values:**

| Field | Value |
| --- | --- |
| Symbol | `BTCUSD` |
| Action | `Buy` |
| Order type | `Market` |
| Quantity | `0.001` |

**Suggested narration:**

> “A market order prioritizes execution now using the freshest available quote. The displayed amount is an estimate because prices can move before the final fill. TradePulse requires a fresh quote and applies account and exposure controls before accepting the instruction.”

**Expected result when accepted:**

- Cash decreases by the actual fill amount.
- BTCUSD quantity increases by `0.001`.
- The order becomes **Filled**.
- A trade, ledger-facing transaction, and audit record are created.
- Downstream risk calculations receive the resulting update.

---

## Slide 6 — Order-to-audit traceability

**Show:** Orders, Trades, and Transactions after the market order.

**Key message:** TradePulse preserves distinct records for the instruction, execution, financial effect, and audit trail.

**Suggested narration:**

> “Orders record what the trader requested and its status. Trades record what executed. Transactions show the ledger-facing financial effect. Together with audit records, this creates a traceable path from market quote to instruction, execution, and oversight.”

**Optional contrast:**

Create, but do not necessarily submit, a BTCUSD limit buy below the current quote.

> “A limit order prioritizes price control rather than immediate execution. It remains Working until the market reaches the chosen limit and may never fill.”

---

## Slide 7 — Independent oversight

**Show:** Briefly sign in as Viewer, Risk Manager, Compliance, and Admin.

**Key message:** Oversight and governance are independent from trade execution.

**Suggested narration:**

> “Viewers inspect authorized account information without placing orders. Risk Managers review portfolio-level exposure. Compliance investigates concerns through cases and audit information. Administrators manage identity, access, and operational configuration. No single role needs every capability.”

**Why it matters:**

- Reduces accidental or unauthorized trading.
- Supports independent challenge of market exposure and activity.
- Preserves a clear governance and audit model.

---

## Slide 8 — Closing message

**Show:** Return to the Trader overview or role summary.

**Key message:** TradePulse connects informed decisions with enforceable controls and independent review.

**Suggested narration:**

> “A Trader uses current quotes and advisory risk context to make an informed order. Ledger Core validates the instruction, records the financial outcome, and produces an audit trail. Risk and Compliance can review independently, while Admin governs access. TradePulse keeps the workflow traceable without giving every user every power.”

## Likely questions

| Question | Concise answer |
| --- | --- |
| Why does the market view sometimes show only BTCUSD? | BTCUSD uses the Coinbase feed. Equity quotes require the configured Finnhub feed and active U.S. market data. |
| Can a market order be rejected? | Yes. It can be rejected for a stale or missing quote, a frozen account, an exposure-control breach, or an attempted sale beyond the held position. |
| Is a limit order guaranteed to fill? | No. It stays Working until the quote reaches the selected limit and can be cancelled or expire without executing. |
| Does VaR predict a future loss? | No. It is an advisory estimate based on observed data, not a guarantee or maximum-loss calculation. |
| Why separate Risk and Compliance from Trader? | Independent roles reduce conflicts of interest and support least-privilege oversight. |

## Demo limitations

- Risk metrics are advisory and depend on the quantity and quality of available historical data.
- BTCUSD is the reliable live-demo symbol; equity data requires a working Finnhub configuration and active market activity.
- The dashboard provides routes for the five roles covered in this guide.
