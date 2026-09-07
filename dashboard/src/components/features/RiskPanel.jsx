"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LiveDot from "@/components/ui/LiveDot";
import { riskEngineFetch } from "@/lib/api/client";
import { openLiveStream } from "@/lib/api/stream";
import { formatNumber, formatDate, isInsufficientHistory } from "@/lib/format";

/**
 * Own-account risk (Trader/Viewer): GET /risk/me on load (snake_case
 * fields - see risk-engine's real response shape), then live-patched
 * by the same accountId-less risk_update SSE event Trader's page
 * always subscribed to. The two endpoints use different casing
 * (var_95 vs var95) - normalized into one shape here so the rest of
 * the component tree never has to think about it.
 */
export default function RiskPanel() {
  const [snapshot, setSnapshot] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    riskEngineFetch("/risk/me")
      .then((data) => {
        if (cancelled) return;
        setSnapshot({
          var95: data.var_95,
          volatility: data.volatility,
          sharpe: data.sharpe,
          computedAt: data.computed_at,
          insufficientHistory: data.insufficient_history,
          explanation: data.risk_explanation,
        });
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
          setSnapshot({
            var95: data.var95,
            volatility: data.volatility,
            sharpe: data.sharpe,
            computedAt: data.computedAt,
            insufficientHistory: isInsufficientHistory(data.insufficientHistory),
            explanation: null,
          });
        });
        eventSource.onerror = () => setLiveConnected(false);
      })
      .catch(() => setLiveConnected(false));

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, []);

  return (
    <Card title="Live risk" action={<LiveDot connected={liveConnected} />}>
      {notFound && <p className="text-sm text-muted">Not enough activity yet for a risk read.</p>}

      {!notFound && !snapshot && <p className="text-sm text-muted">Loading...</p>}

      {!notFound && snapshot && isInsufficientHistory(snapshot.insufficientHistory) && (
        <p className="text-sm text-warning">Not enough price history yet for a meaningful VaR/Sharpe figure.</p>
      )}

      {!notFound && snapshot && !isInsufficientHistory(snapshot.insufficientHistory) && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted">VaR (95%)</div>
              <div className="font-semibold text-fg">{formatNumber(snapshot.var95)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Volatility</div>
              <div className="font-semibold text-fg">{formatNumber(snapshot.volatility)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Sharpe</div>
              <div className="font-semibold text-fg">{formatNumber(snapshot.sharpe)}</div>
            </div>
          </div>
          {snapshot.explanation && <p className="mt-2 text-xs text-muted">{snapshot.explanation}</p>}
          <p className="mt-2 text-xs text-muted">as of {formatDate(snapshot.computedAt)}</p>
        </>
      )}
    </Card>
  );
}
