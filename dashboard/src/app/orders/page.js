"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ledgerCoreFetch } from "@/lib/api/client";

const POLL_INTERVAL_MS = 5000;

/**
 * Lists the caller's orders, newest first, straight off GET /orders, and
 * lets them place a new MARKET order via POST /orders (see
 * ledger-core/API.md for both). Polls on an interval rather than opening
 * a stream — ticket-authenticated SSE is Phase 10's job, so this view
 * stays a plain REST read until that lands.
 */
export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const loadOrders = async () => {
    try {
      const data = await ledgerCoreFetch("/orders");
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await ledgerCoreFetch("/orders");
        if (!cancelled) {
          setOrders(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await ledgerCoreFetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          side,
          orderType: "MARKET",
          quantity: Number(quantity),
        }),
      });
      setLastResult(result);
      setQuantity("");
      await loadOrders();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <p>Loading...</p>;

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <p>You need to sign in first.</p>
        <Link href="/">Back to sign in</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <p>
        <Link href="/">&larr; Back</Link>
      </p>
      <h1>Orders</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol (e.g. BTCUSD)"
          required
        />
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity"
          type="number"
          step="any"
          min="0"
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Placing..." : "Place order"}
        </button>
      </form>

      {submitError && <p style={{ color: "red" }}>{submitError}</p>}

      {lastResult && (
        <p
          style={{
            color: lastResult.status === "FILLED" ? "green" : "#b8860b",
          }}
        >
          {lastResult.status === "FILLED"
            ? `Filled at ${lastResult.fillPrice}`
            : `Rejected: ${lastResult.rejectionReason}`}
        </p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {orders === null && !error && <p>Loading orders...</p>}

      {orders !== null && orders.length === 0 && <p>No orders yet.</p>}

      {orders !== null && orders.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={cellStyle}>Symbol</th>
              <th style={cellStyle}>Side</th>
              <th style={cellStyle}>Qty</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}>Reason</th>
              <th style={cellStyle}>Fill price</th>
              <th style={cellStyle}>Executed at</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId}>
                <td style={cellStyle}>{order.symbol}</td>
                <td style={cellStyle}>{order.side}</td>
                <td style={cellStyle}>{order.quantity}</td>
                <td style={cellStyle}>{order.status}</td>
                <td style={cellStyle}>{order.rejectionReason ?? "—"}</td>
                <td style={cellStyle}>{order.fillPrice ?? "—"}</td>
                <td style={cellStyle}>
                  {order.executedAt
                    ? new Date(order.executedAt).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const cellStyle = {
  border: "1px solid #ccc",
  padding: "6px 10px",
  textAlign: "left",
};