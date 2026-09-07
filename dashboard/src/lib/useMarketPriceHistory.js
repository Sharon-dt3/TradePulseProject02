"use client";

import { useEffect, useRef, useState } from "react";
import { ledgerCoreFetch } from "@/lib/api/client";

const POLL_INTERVAL_MS = 5000;
const MAX_POINTS = 60; // 5 minutes of history at a 5s poll cadence

/**
 * Polls GET /market/prices every 5s and keeps a capped rolling history
 * per symbol, client-side only. Nothing on the backend exposes a price
 * time series to the dashboard - risk-engine's own price_history table
 * feeds VaR internally, it isn't a public endpoint - so this is the
 * honest amount of history available: whatever accumulates while this
 * tab stays open, gone on reload. One poll loop shared by both
 * MarketPricesTable and MarketPriceSparklines, called once by the page
 * and passed down, rather than each component hitting the API on its
 * own 5s timer.
 */
export function useMarketPriceHistory() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState({}); // symbol -> [{ price, ts }]
  const historyRef = useRef({});

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      ledgerCoreFetch("/market/prices")
        .then((rows) => {
          if (cancelled) return;
          setLatest(rows);

          const now = Date.now();
          const next = { ...historyRef.current };
          rows.forEach((r) => {
            const points = next[r.symbol] ? [...next[r.symbol], { price: r.price, ts: now }] : [{ price: r.price, ts: now }];
            next[r.symbol] = points.length > MAX_POINTS ? points.slice(points.length - MAX_POINTS) : points;
          });
          historyRef.current = next;
          setHistory(next);
        })
        .catch(() => {
          if (!cancelled) setLatest([]);
        });
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { latest, history };
}
