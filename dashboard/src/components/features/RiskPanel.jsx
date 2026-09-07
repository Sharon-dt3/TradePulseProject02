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
            explanation: data.explanation ?? null,
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
              <div
                className="w-fit cursor-help text-xs text-muted underline decoration-dotted underline-offset-2"
                title="Value at Risk, 95% confidence: the most this portfolio would be expected to lose in a single day, 95% of the time, based on recent price volatility."
              >
                VaR (95%)
              </div>
              <div className="font-serif-display tabular-nums text-lg font-semibold text-fg">
                {formatNumber(snapshot.var95)}
              </div>
            </div>
            <div>
              <div
                className="w-fit cursor-help text-xs text-muted underline decoration-dotted underline-offset-2"
                title="How much the portfolio's value has been swinging recently. Higher means less predictable day-to-day value."
              >
                Volatility
              </div>
              <div className="font-serif-display tabular-nums text-lg font-semibold text-fg">
                {formatNumber(snapshot.volatility)}
              </div>
            </div>
            <div>
              <div
                className="w-fit cursor-help text-xs text-muted underline decoration-dotted underline-offset-2"
                title="Sharpe ratio: return earned per unit of risk taken, above a risk-free baseline. Higher is better; negative means the risk taken isn't being rewarded."
              >
                Sharpe
              </div>
              <div className="font-serif-display tabular-nums text-lg font-semibold text-fg">
                {formatNumber(snapshot.sharpe)}
              </div>
            </div>
          </div>
          {snapshot.explanation && <p className="mt-2 text-xs text-muted">{snapshot.explanation}</p>}
          <p className="mt-2 text-xs text-muted">as of {formatDate(snapshot.computedAt)}</p>
        </>
      )}
    </Card>
  );
}
