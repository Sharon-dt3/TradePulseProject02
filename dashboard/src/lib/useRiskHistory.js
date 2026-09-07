"use client";

import { useEffect, useRef, useState } from "react";
import { riskEngineFetch } from "@/lib/api/client";
import { openLiveStream } from "@/lib/api/stream";
import { isInsufficientHistory } from "@/lib/format";

const MAX_POINTS = 60;

/**
 * Own-account risk, kept as a client-side rolling history rather than
 * just the latest snapshot - GET /risk/me on load (snake_case fields),
 * then live-patched by the risk_update SSE event (camelCase fields,
 * normalized to the same shape here). This is a second, independent
 * subscriber to the same feed RiskPanel already opens - a small
 * duplication traded deliberately for zero risk of touching RiskPanel's
 * already-verified behavior. Nothing here is persisted: history is
 * whatever accumulates while this tab stays open, same honesty
 * trade-off useMarketPriceHistory already makes for prices.
 */
export function useRiskHistory() {
  const [latest, setLatest] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);

  const pushSnapshot = (snap) => {
    if (isInsufficientHistory(snap.insufficientHistory)) return;
    const point = {
      var95: Number(snap.var95),
      volatility: Number(snap.volatility),
      sharpe: Number(snap.sharpe),
      ts: snap.computedAt ? new Date(snap.computedAt).getTime() : Date.now(),
    };
    const next = [...historyRef.current, point];
    historyRef.current = next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
    setHistory(historyRef.current);
  };

  useEffect(() => {
    let cancelled = false;
    riskEngineFetch("/risk/me")
      .then((data) => {
        if (cancelled) return;
        const snap = {
          var95: data.var_95,
          volatility: data.volatility,
          sharpe: data.sharpe,
          computedAt: data.computed_at,
          insufficientHistory: data.insufficient_history,
          explanation: data.risk_explanation,
        };
        setLatest(snap);
        pushSnapshot(snap);
      })
      .catch((err) => {
        if (!cancelled && err.status === 404) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let eventSource;

    openLiveStream()
      .then((es) => {
        if (cancelled) {
          es.close();
          return;
        }
        eventSource = es;
        eventSource.addEventListener("connected", () => setLiveConnected(true));
        eventSource.addEventListener("risk_update", (e) => {
          const data = JSON.parse(e.data);
          setNotFound(false);
          const snap = {
            var95: data.var95,
            volatility: data.volatility,
            sharpe: data.sharpe,
            computedAt: data.computedAt,
            insufficientHistory: isInsufficientHistory(data.insufficientHistory),
            explanation: data.explanation ?? null,
          };
          setLatest(snap);
          pushSnapshot(snap);
        });
        eventSource.onerror = () => setLiveConnected(false);
      })
      .catch(() => setLiveConnected(false));

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, []);

  return { latest, history, notFound, liveConnected };
}
