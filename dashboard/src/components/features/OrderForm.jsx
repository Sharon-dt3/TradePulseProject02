"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { rejectionMessage, formatMoney } from "@/lib/format";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "BTCUSD"];

export default function OrderForm({ onSubmit, prices }) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const livePrice = prices?.find((p) => p.symbol === symbol)?.price ?? null;
  const estimatedNotional =
    livePrice && quantity ? Number(livePrice) * Number(quantity) : null;

  const openReview = (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setReviewOpen(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    try {
      const body = {
        symbol: symbol.trim().toUpperCase(),
        side,
        orderType,
        quantity: Number(quantity),
        requestId: crypto.randomUUID(),
      };
      if (orderType === "LIMIT") {
        body.limitPrice = Number(limitPrice);
      }
      const res = await onSubmit(body);
      setResult(res);
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
    <form onSubmit={openReview} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Symbol">
          <select className={inputCls} value={symbol} onChange={(e) => setSymbol(e.target.value)} required>
            <option value="" disabled>
              Select a symbol
            </option>
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Side">
          <select className={inputCls} value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </FormField>
        <FormField label="Order type">
          <select className={inputCls} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
          </select>
        </FormField>
        <FormField label="Quantity">
          <input
            className={inputCls}
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </FormField>
        {orderType === "LIMIT" && (
          <FormField label="Limit price">
            <input
              className={inputCls}
              type="number"
              step="any"
              min="0"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              required
            />
          </FormField>
        )}
      </div>

      {symbol && (
        <p className="text-xs text-muted">
          {livePrice
            ? `Last price: ${formatMoney(livePrice)}${
                estimatedNotional ? ` · Est. ${orderType === "MARKET" ? "cost" : "notional"}: ${formatMoney(estimatedNotional)}` : ""
              }`
            : "No live price cached for this symbol yet — order may be rejected (NO_MARKET)."}
        </p>
      )}

      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      {result && (
        <Alert tone={result.status === "FILLED" ? "success" : "warning"}>
          {result.status === "FILLED"
            ? `Filled at ${formatMoney(result.fillPrice)}`
            : `${result.status}${result.rejectionReason ? `: ${rejectionMessage(result.rejectionReason)}` : ""}`}
        </Alert>
      )}

      <Button type="submit">Place order</Button>

      <Modal
        open={reviewOpen}
        title="Review order"
        onClose={() => setReviewOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit} loading={submitting}>
              Confirm {side === "BUY" ? "buy" : "sell"}
            </Button>
          </>
        }
      >
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Symbol</dt>
            <dd className="font-medium text-fg">{symbol}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Side</dt>
            <dd className="font-medium text-fg">{side === "BUY" ? "Buy" : "Sell"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Order type</dt>
            <dd className="font-medium text-fg">{orderType === "MARKET" ? "Market" : "Limit"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Quantity</dt>
            <dd className="font-medium text-fg">{quantity}</dd>
          </div>
          {orderType === "LIMIT" && (
            <div className="flex justify-between">
              <dt className="text-muted">Limit price</dt>
              <dd className="font-medium text-fg">{formatMoney(limitPrice)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2">
            <dt className="text-muted">
              {livePrice ? `Est. ${orderType === "MARKET" ? "cost" : "notional"}` : "Live price"}
            </dt>
            <dd className="font-medium text-fg">
              {estimatedNotional ? formatMoney(estimatedNotional) : "Unavailable"}
            </dd>
          </div>
        </dl>
      </Modal>
    </form>
  );
}
