"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ledgerCoreFetch } from "@/lib/api/client";

const POLL_INTERVAL_MS = 5000;

/**
 * Lists the caller's orders, newest first, straight off GET /orders
 * (see ledger-core/API.md). Polls on an interval rather than opening a
 * stream — ticket-authenticated SSE is Phase 10's job, so this view
 * stays a plain REST read until that lands.
 */
export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const load = async () => {
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

    load();
    const intervalId = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user]);

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
