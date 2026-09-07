/** Shared formatting/labeling helpers used across every role view. */

export function formatMoney(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function formatNumber(value, digits = 4) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function formatPct(value) {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

const REJECTION_MESSAGES = {
  NO_MARKET: "No market price is currently available for this symbol.",
  STALE_PRICE: "The last known price for this symbol is too old to trade on.",
  INSUFFICIENT_POSITION: "This would take the account's position below zero.",
  NOTIONAL_LIMIT_EXCEEDED: "This order would exceed the account's notional exposure limit.",
  ACCOUNT_FROZEN: "This account is frozen and cannot place new orders.",
};

export function rejectionMessage(reason) {
  if (!reason) return null;
  return REJECTION_MESSAGES[reason] ?? reason;
}

/**
 * risk-engine's SSE risk_update payload has been observed sending
 * insufficientHistory as the Python-stringified "True"/"False" rather
 * than a real JSON boolean - "False" is truthy in JS, so this is the
 * one place that gets normalized rather than every call site guessing.
 */
export function isInsufficientHistory(value) {
  if (typeof value === "boolean") return value;
  return value === "True" || value === "true";
}

/** Status pill color tokens by semantic meaning - used by Badge callers. */
export function statusTone(status) {
  const s = String(status).toUpperCase();
  if (["FILLED", "OPEN", "ACTIVE"].includes(s)) return "success";
  if (["REJECTED", "CLOSED", "FROZEN", "EXPIRED"].includes(s)) return "danger";
  if (["WORKING", "PENDING"].includes(s)) return "warning";
  return "info";
}
