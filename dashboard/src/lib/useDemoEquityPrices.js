"use client";

import { useEffect, useRef, useState } from "react";

const UPDATE_INTERVAL_MS = 5000;
const MAX_POINTS = 60;
const DEMO_SYMBOLS = [
  { symbol: "AAPL", startingPrice: 228.45, volatility: 0.0018 },
  { symbol: "MSFT", startingPrice: 510.12, volatility: 0.0015 },
  { symbol: "GOOGL", startingPrice: 278.63, volatility: 0.0019 },
  { symbol: "TSLA", startingPrice: 425.71, volatility: 0.0032 },
];

/**
 * Produces explicitly simulated equity display values for a non-trading demo.
 *
 * This hook is deliberately client-side and does not send data to Redis,
 * ledger-core, orders, positions, portfolio totals, or risk calculations.
 * It is enabled only with NEXT_PUBLIC_DEMO_EQUITY_PRICES=true.
 */
export function useDemoEquityPrices() {
  const enabled = process.env.NEXT_PUBLIC_DEMO_EQUITY_PRICES === "true";
  const pricesRef = useRef(
    Object.fromEntries(DEMO_SYMBOLS.map(({ symbol, startingPrice }) => [symbol, startingPrice])),
  );
  const [latest, setLatest] = useState([]);
  const [history, setHistory] = useState({});

  useEffect(() => {
    if (!enabled) {
      setLatest([]);
      setHistory({});
      return undefined;
    }

    const updatePrices = () => {
      const timestamp = Date.now();
      const rows = DEMO_SYMBOLS.map(({ symbol, volatility }) => {
        const current = pricesRef.current[symbol];
        const movement = (Math.random() * 2 - 1) * volatility;
        const next = Math.max(0.01, current * (1 + movement));

        pricesRef.current[symbol] = next;
        return { symbol, price: next, ageMs: 0, simulated: true, ts: timestamp };
      });

      setLatest(rows);
      setHistory((currentHistory) => {
        const nextHistory = { ...currentHistory };

        rows.forEach((row) => {
          const points = [...(nextHistory[row.symbol] ?? []), { price: row.price, ts: timestamp }];
          nextHistory[row.symbol] =
            points.length > MAX_POINTS ? points.slice(points.length - MAX_POINTS) : points;
        });

        return nextHistory;
      });
    };

    updatePrices();
    const intervalId = setInterval(updatePrices, UPDATE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled]);

  return { enabled, latest, history };
}
