"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import { rejectionMessage } from "@/lib/format";

export default function OrderForm({ onSubmit }) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Symbol">
          <input className={inputCls} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="BTCUSD" required />
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

      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      {result && (
        <Alert tone={result.status === "FILLED" ? "success" : "warning"}>
          {result.status === "FILLED"
            ? `Filled at ${result.fillPrice}`
            : `${result.status}${result.rejectionReason ? `: ${rejectionMessage(result.rejectionReason)}` : ""}`}
        </Alert>
      )}

      <Button type="submit" loading={submitting}>
        Place order
      </Button>
    </form>
  );
}
