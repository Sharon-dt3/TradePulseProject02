"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { rejectionMessage, formatMoney } from "@/lib/format";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "BTCUSD"];

/** A directional (not numeric) pre-trade risk hint, computed client-side
 * from positions already on screen - deliberately no fabricated VaR
 * number here, since that needs risk-engine's real variance data. This
 * only says which way risk would move, in plain language. */
function riskHint(side, symbol, positions, prices) {
  if (!positions || !prices || positions.length === 0) return null;
  const priced = positions
    .map((p) => {
      const quote = prices.find((r) => r.symbol === p.symbol);
      return quote ? { symbol: p.symbol, value: Number(p.quantity) * Number(quote.price) } : null;
    })
    .filter(Boolean);
  const total = priced.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) return null;

  const holding = priced.find((p) => p.symbol === symbol);
  const currentWeight = holding ? holding.value / total : 0;
  const isLargest = holding && holding.value === Math.max(...priced.map((p) => p.value));

  if (side === "BUY" && priced.length === 1 && holding) {
    return "This is already your only holding — buying more increases concentration risk rather than diversifying it.";
  }
  if (side === "BUY" && isLargest && currentWeight >= 0.5) {
    return `${symbol} is already your largest position (${(currentWeight * 100).toFixed(0)}% of holdings) — buying more increases concentration risk.`;
  }
  if (side === "SELL" && holding && currentWeight >= 0.5) {
    return `Selling reduces exposure to ${symbol}, your largest position — this would lower concentration risk.`;
  }
  return null;
}

export default function OrderForm({ onSubmit, prices, positions, initialSymbol = "" }) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (initialSymbol && SYMBOLS.includes(initialSymbol)) {
      setSymbol(initialSymbol);
      setError(null);
    }
  }, [initialSymbol]);

  const livePrice = prices?.find((price) => price.symbol === symbol)?.price ?? null;
  const effectivePrice = orderType === "LIMIT" ? Number(limitPrice) : Number(livePrice);
  const estimatedNotional = effectivePrice && quantity ? effectivePrice * Number(quantity) : null;
  const hasValidQuantity = Number(quantity) > 0;
  const hasValidLimit = orderType !== "LIMIT" || Number(limitPrice) > 0;

  const openReview = (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!hasValidQuantity || !hasValidLimit) {
      setError("Enter a quantity greater than zero and, for a limit order, a valid limit price.");
      return;
    }
    setReviewOpen(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    try {
      const body = { symbol: symbol.trim().toUpperCase(), side, orderType, quantity: Number(quantity), requestId: crypto.randomUUID() };
      if (orderType === "LIMIT") body.limitPrice = Number(limitPrice);
      const response = await onSubmit(body);
      setResult(response);
      setQuantity("");
      setLimitPrice("");
      setReviewOpen(false);
    } catch (err) {
      setError(err.message);
      setReviewOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={openReview} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Symbol" hint="Quotes may be delayed outside market hours.">
          <select className={inputCls} value={symbol} onChange={(event) => setSymbol(event.target.value)} required>
            <option value="" disabled>Select a symbol</option>
            {SYMBOLS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </FormField>
        <FormField label="Action">
          <select className={inputCls} value={side} onChange={(event) => setSide(event.target.value)}>
            <option value="BUY">Buy</option><option value="SELL">Sell</option>
          </select>
        </FormField>
        <FormField label="Order type">
          <select className={inputCls} value={orderType} onChange={(event) => setOrderType(event.target.value)}>
            <option value="MARKET">Market</option><option value="LIMIT">Limit</option>
          </select>
        </FormField>
        <FormField label="Quantity">
          <input className={inputCls} type="number" inputMode="decimal" step="any" min="0.00000001" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
        </FormField>
      </div>

      {orderType === "LIMIT" && (
        <div className="max-w-sm">
          <FormField label="Limit price" hint="A limit order may not execute if the market does not reach your price.">
            <input className={inputCls} type="number" inputMode="decimal" step="any" min="0.00000001" value={limitPrice} onChange={(event) => setLimitPrice(event.target.value)} required />
          </FormField>
        </div>
      )}

      <div className="rounded-lg border border-line bg-bg px-4 py-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium text-fg">Order estimate</span>
          <span className="font-serif-display tabular-nums text-lg font-semibold text-fg">{estimatedNotional ? formatMoney(estimatedNotional) : "Awaiting quote"}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {livePrice ? `Latest ${symbol} quote: ${formatMoney(livePrice)}. ` : "No current quote is available; the order may be rejected. "}
          Market orders execute at the available market price and the final execution price can differ from this estimate. Fees, taxes, and settlement effects are not included.
        </p>
      </div>

      {symbol && riskHint(side, symbol, positions, prices) && (
        <p className="text-xs text-info">{riskHint(side, symbol, positions, prices)}</p>
      )}

      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>
      {result && <Alert tone={result.status === "FILLED" ? "success" : "warning"}>{result.status === "FILLED" ? `Order filled at ${formatMoney(result.fillPrice)}.` : `${result.status}${result.rejectionReason ? `: ${rejectionMessage(result.rejectionReason)}` : ""}`}</Alert>}

      <Button type="submit">Review order</Button>

      <Modal open={reviewOpen} title="Review your order" onClose={() => setReviewOpen(false)} footer={<><Button type="button" variant="secondary" onClick={() => setReviewOpen(false)} disabled={submitting}>Edit order</Button><Button type="button" onClick={confirmSubmit} loading={submitting}>Submit {side.toLowerCase()} order</Button></>}>
        <dl className="space-y-3 text-sm">
          {[["Action", side === "BUY" ? "Buy" : "Sell"], ["Symbol", symbol], ["Order type", orderType === "MARKET" ? "Market" : "Limit"], ["Quantity", quantity], ...(orderType === "LIMIT" ? [["Limit price", formatMoney(limitPrice)]] : []), ["Estimated order value", estimatedNotional ? formatMoney(estimatedNotional) : "Unavailable"]].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-5"><dt className="text-muted">{label}</dt><dd className="text-right font-medium text-fg">{value}</dd></div>
          ))}
        </dl>
        <Alert tone="warning"><span className="text-xs">By submitting, you acknowledge that quotes can change and that a market order has no guaranteed execution price.</span></Alert>
      </Modal>
    </form>
  );
}
