"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import LiveDot from "@/components/ui/LiveDot";
import { riskEngineFetch } from "@/lib/api/client";
import { openLiveStream } from "@/lib/api/stream";
import {
  formatMoney,
  formatNumber,
  formatPct,
  isInsufficientHistory,
} from "@/lib/format";

function normalizeSnapshot(data) {
  return {
    var95: data.var_95 ?? data.var95,
    volatility: data.volatility,
    sharpe: data.sharpe,
    computedAt: data.computed_at ?? data.computedAt,
    insufficientHistory: isInsufficientHistory(
      data.insufficient_history ?? data.insufficientHistory
    ),
    explanation: data.risk_explanation ?? data.explanation,
  };
}

function formatDelta(value, formatter) {
  if (value === null || value === undefined) return "Awaiting comparison";
  const amount = Number(value);
  return `${amount > 0 ? "+" : ""}${formatter(amount)}`;
}

function deltaTone(value, positiveIsGood = false) {
  if (value === null || value === undefined || Number(value) === 0) {
    return "text-muted";
  }
  const favorable = positiveIsGood ? Number(value) > 0 : Number(value) < 0;
  return favorable ? "text-success" : "text-danger";
}

function buildChangeExplanation(changes, sampleSize) {
  if (sampleSize < 2) {
    return "One risk observation is available. Trade and market activity will create a comparison after the next recalculation.";
  }

  const drivers = [];
  if (changes.var_95 !== null && changes.var_95 !== undefined) {
    drivers.push(
      Number(changes.var_95) > 0
        ? "Estimated one-day downside risk increased."
        : Number(changes.var_95) < 0
          ? "Estimated one-day downside risk decreased."
          : "Estimated one-day downside risk was unchanged."
    );
  }
  if (changes.volatility !== null && changes.volatility !== undefined) {
    drivers.push(
      Number(changes.volatility) > 0
        ? "Recent portfolio swings widened."
        : Number(changes.volatility) < 0
          ? "Recent portfolio swings narrowed."
          : "Recent portfolio swings were unchanged."
    );
  }
  if (changes.sharpe !== null && changes.sharpe !== undefined) {
    drivers.push(
      Number(changes.sharpe) > 0
        ? "Risk-adjusted returns improved."
        : Number(changes.sharpe) < 0
          ? "Risk-adjusted returns weakened."
          : "Risk-adjusted returns were unchanged."
    );
  }

  return drivers.join(" ");
}

function PortfolioTrend({ trend }) {
  const values = trend.map((point) => Number(point.portfolio_value));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const polylinePoints = values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 100 - ((value - minimum) / range) * 84 - 8;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted">
          Recorded portfolio trend
        </p>
        <p className="text-xs text-muted">{trend.length} observations</p>
      </div>
      <svg
        className="mt-3 h-20 w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Recorded portfolio value trend"
      >
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          className="text-primary"
        />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{formatMoney(values[0])}</span>
        <span>{formatMoney(values[values.length - 1])}</span>
      </div>
    </div>
  );
}

/**
 * Shows the authenticated trader's live risk snapshot alongside a recorded
 * account-history comparison. Live updates refresh the headline metrics;
 * the trend is deliberately based on persisted snapshots only.
 */
export default function RiskPanel() {
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      riskEngineFetch("/risk/me"),
      riskEngineFetch("/risk/me/history"),
    ])
      .then(([riskSnapshot, riskHistory]) => {
        if (cancelled) return;
        setSnapshot(normalizeSnapshot(riskSnapshot));
        setHistory(riskHistory);
      })
      .catch((error) => {
        if (!cancelled && error.status === 404) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let eventSource;

    openLiveStream()
      .then((stream) => {
        if (cancelled) {
          stream.close();
          return;
        }

        eventSource = stream;
        eventSource.addEventListener("connected", () => setLiveConnected(true));
        eventSource.addEventListener("risk_update", (event) => {
          const data = JSON.parse(event.data);
          setNotFound(false);
          setSnapshot(normalizeSnapshot(data));
          riskEngineFetch("/risk/me/history").then(setHistory).catch(() => {});
        });
        eventSource.onerror = () => setLiveConnected(false);
      })
      .catch(() => setLiveConnected(false));

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, []);

  const changeExplanation = useMemo(
    () =>
      history
        ? buildChangeExplanation(history.changes, history.sample_size)
        : null,
    [history]
  );

  return (
    <Card
      title="Live risk analysis"
      action={<LiveDot connected={liveConnected} />}
      className="h-full"
    >
      {notFound && (
        <p className="text-sm text-muted">
          Not enough account activity exists yet for a risk read.
        </p>
      )}

      {!notFound && !snapshot && <p className="text-sm text-muted">Loading risk analysis…</p>}

      {!notFound && snapshot && (
        <>
          {snapshot.insufficientHistory ? (
            <p className="text-sm text-warning">
              Not enough price history yet for meaningful VaR, volatility, or Sharpe values.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-primary-soft/45 px-3 py-2">
                <p className="text-xs text-muted">VaR (95%)</p>
                <p className="font-serif-display tabular-nums text-lg font-semibold text-fg">
                  {formatNumber(snapshot.var95)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg bg-primary-soft/45 px-3 py-2">
                <p className="text-xs text-muted">Volatility</p>
                <p className="font-serif-display tabular-nums text-lg font-semibold text-fg">
                  {formatPct(snapshot.volatility)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg bg-primary-soft/45 px-3 py-2">
                <p className="text-xs text-muted">Sharpe</p>
                <p className="font-serif-display tabular-nums text-lg font-semibold text-fg">
                  {formatNumber(snapshot.sharpe)}
                </p>
              </div>
            </div>
          )}

          {snapshot.explanation && (
            <p className="mt-3 text-xs leading-relaxed text-muted">{snapshot.explanation}</p>
          )}

          {history && (
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              <PortfolioTrend trend={history.trend} />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted">Portfolio change</p>
                  <p className={`text-right text-sm font-semibold ${deltaTone(history.changes.portfolio_value, true)}`}>
                    {formatDelta(history.changes.portfolio_value, formatMoney)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted">VaR change</p>
                  <p className={`text-right text-sm font-semibold ${deltaTone(history.changes.var_95)}`}>
                    {formatDelta(history.changes.var_95, formatNumber)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted">Sharpe change</p>
                  <p className={`text-right text-sm font-semibold ${deltaTone(history.changes.sharpe, true)}`}>
                    {formatDelta(history.changes.sharpe, formatNumber)}
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted">{changeExplanation}</p>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted">
                  Recent execution context
                </p>
                {history.recent_trades.length ? (
                  <ul className="mt-2 space-y-1.5 text-xs text-muted">
                    {history.recent_trades.map((trade) => (
                      <li key={`${trade.executed_at}-${trade.symbol}`}>
                        <span className="font-medium text-fg">{trade.side}</span>{" "}
                        {trade.quantity} {trade.symbol} at {formatMoney(trade.price)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">
                    No executed trades are available in the recorded account history.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
