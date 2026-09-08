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
    return "One recorded risk observation is available. A later recalculation will provide a comparison.";
  }

  const drivers = [];
  if (changes.var_95 !== null && changes.var_95 !== undefined) {
    drivers.push(
      Number(changes.var_95) > 0
        ? "Estimated downside risk increased."
        : Number(changes.var_95) < 0
          ? "Estimated downside risk decreased."
          : "Estimated downside risk was unchanged."
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

  return drivers.join(" ");
}

function PortfolioTrend({ trend }) {
  if (!trend?.length) return null;

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

function metricChange(history, key, formatter) {
  const change = history?.changes?.[key];
  if (change === null || change === undefined) {
    return "A prior stored risk snapshot is not available for comparison yet.";
  }

  const amount = Number(change);
  if (amount === 0) return "This value is unchanged from the prior stored risk snapshot.";
  return `Since the prior stored risk snapshot, this value ${amount > 0 ? "increased" : "decreased"} by ${formatter(Math.abs(amount))}.`;
}

function recentTradeContext(history) {
  const trade = history?.recent_trades?.[0];
  if (!trade) return "No recent execution is available to place this update in trading context.";

  const executedAt = trade.executed_at
    ? new Date(trade.executed_at).toLocaleString()
    : "an unknown time";
  return `Most recent execution: ${trade.side} ${formatNumber(trade.quantity)} ${trade.symbol} at ${formatMoney(trade.price)} on ${executedAt}. This is timing context only; it does not establish that the trade caused the risk change.`;
}

function volatilityExplanation(analysis, history) {
  const volatility = Number(analysis.volatility);
  if (!Number.isFinite(volatility)) {
    return "Volatility is unavailable because the current holdings do not yet have enough aligned persisted price observations.";
  }
  if (volatility === 0 && !(analysis.positions ?? []).length) {
    return "Volatility is 0% because this is currently a cash-only account with no priced position exposure.";
  }
  if (volatility === 0) {
    return "Volatility is genuinely 0% for the current aligned return window: the observed portfolio returns did not vary. It will change when persisted quotes produce differing returns.";
  }
  if (volatility < 0.00005) {
    return `The displayed 0.00% is rounding: the current unrounded volatility is ${(volatility * 100).toFixed(5)}%.`;
  }
  return `${metricChange(history, "volatility", formatPct)} ${recentTradeContext(history)}`;
}

function RiskMetricDetails({ label, value, variant, children }) {
  return (
    <details className={`risk-live-metric risk-live-metric-${variant} group rounded-xl px-3 py-3`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.06em]">{label}</span>
          <span className="mt-1 block font-serif-display tabular-nums text-xl font-bold">{value}</span>
        </span>
        <span aria-hidden="true" className="risk-live-metric-expand pt-1 text-xl font-bold transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="risk-live-metric-evidence mt-3 border-t pt-3 text-xs leading-relaxed">{children}</p>
    </details>
  );
}

function DetailedRiskMetrics({ analysis, history }) {
  const varPercent =
    analysis.portfolio_value && analysis.var_95 !== null
      ? Number(analysis.var_95) / Math.abs(Number(analysis.portfolio_value))
      : null;
  const calculatedAt = analysis.data_as_of
    ? new Date(analysis.data_as_of).toLocaleString()
    : "No current price data";
  const quoteFreshness = analysis.price_freshness ?? [];

  if (analysis.insufficient_history) {
    return (
      <p className="text-sm text-warning">
        Insufficient persisted price history for a reliable risk calculation.
        Risk values will appear after additional market observations are stored.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {analysis.price_data_stale && (
        <p className="risk-live-alert rounded-xl px-3 py-2.5 text-sm font-semibold text-warning">
          Delayed market data: {analysis.stale_symbols.join(", ")}. Risk estimates may
          not reflect their latest prices.
        </p>
      )}
      {quoteFreshness.length > 0 && (
        <details className="risk-live-freshness group rounded-xl px-3 py-2.5 text-xs text-muted">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="font-medium text-fg">Quote freshness by holding</span>
            <span aria-hidden="true" className="text-base transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 border-t border-line pt-2 leading-relaxed">
            Each risk calculation uses the latest persisted quote for every holding. “Fresh” means the quote is within its asset-class threshold; equity quotes outside U.S. market hours are marked market closed rather than requiring an intraday update.
          </p>
          <ul className="mt-2 space-y-1">
            {quoteFreshness.map((quote) => (
              <li key={quote.symbol}>
                {quote.symbol}:{" "}
                {quote.status === "fresh"
                  ? `fresh (${quote.age_seconds}s old; ${quote.stale_after_seconds}s threshold)`
                  : quote.status === "market_closed"
                  ? "market closed — using the latest regular-session quote"
                  : quote.status === "missing"
                    ? "no persisted quote is available"
                    : `delayed (${quote.age_seconds}s old; ${quote.stale_after_seconds}s threshold)`}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <RiskMetricDetails
          label="One-period 95% VaR"
          value={`${formatMoney(analysis.var_95)}${varPercent !== null ? ` / ${formatPct(varPercent)}` : ""}`}
          variant="var"
        >
          This is the modelled one-period loss threshold at 95% confidence, calculated as 1.645 × current volatility × absolute portfolio value. {metricChange(history, "var_95", formatMoney)} {recentTradeContext(history)}
        </RiskMetricDetails>
        <RiskMetricDetails label="Historical VaR" value={formatMoney(analysis.historical_var_95)} variant="historical">
          This is the loss at the 95% tail cutoff of the observed aligned portfolio-return sample. It is based on actual persisted return outcomes rather than the parametric volatility formula. Historical VaR and expected shortfall are calculated live; prior values are not stored in the current snapshot history. {recentTradeContext(history)}
        </RiskMetricDetails>
        <RiskMetricDetails label="Expected shortfall" value={formatMoney(analysis.expected_shortfall_95)} variant="shortfall">
          This is the average loss among the worst observed 5% of aligned return outcomes. It answers “how severe were the tail losses?” rather than only identifying the cutoff. It is calculated live; prior expected-shortfall values are not stored in the current snapshot history. {recentTradeContext(history)}
        </RiskMetricDetails>
        <RiskMetricDetails label="Volatility" value={formatPct(analysis.volatility)} variant="volatility">
          Volatility is the standard deviation of aligned observed portfolio returns in the current risk window. {volatilityExplanation(analysis, history)}
        </RiskMetricDetails>
      </div>

      <div className="grid gap-3 border-t border-line pt-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
        {analysis.largest_position && (
          <div
            className={`risk-live-concentration rounded-xl px-3 py-3 text-sm ${
              analysis.concentration_warning
                ? "bg-warning/10 text-warning"
                : "bg-bg text-fg"
            }`}
          >
            <span className="font-medium">{analysis.largest_position}</span> is{" "}
            {formatPct(analysis.concentration_pct)} of portfolio value.
            {analysis.concentration_warning && " This exceeds the concentration warning threshold."}
          </div>
        )}

        <div className="risk-live-contributions rounded-xl px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted">
            Position risk contribution
          </p>
          <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {analysis.positions.slice(0, 4).map((position) => (
              <div key={position.symbol} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-fg">
                  {position.symbol} · {formatPct(position.weight)}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatMoney(position.component_var_95)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {analysis.methodology?.covariance_model}. {analysis.methodology?.confidence_level * 100}% confidence,
        {" "}{analysis.methodology?.horizon}, {analysis.sample_size} aligned returns. Price data as of {calculatedAt}.
      </p>
    </div>
  );
}

/**
 * Shows detailed current portfolio risk and the existing persisted trend for
 * the authenticated trader. Detailed calculations are read independently from
 * the legacy snapshot stream so current risk can expose its methodology.
 */
export default function RiskPanel() {
  const [snapshot, setSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const loadRisk = () =>
    Promise.all([
      riskEngineFetch("/risk/me").then(normalizeSnapshot),
      riskEngineFetch("/risk/me/analysis"),
      riskEngineFetch("/risk/me/history"),
    ]).then(([nextSnapshot, nextAnalysis, nextHistory]) => {
      setSnapshot(nextSnapshot);
      setAnalysis(nextAnalysis);
      setHistory(nextHistory);
      setNotFound(false);
    });

  useEffect(() => {
    let cancelled = false;

    loadRisk().catch((error) => {
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
        eventSource.addEventListener("risk_update", () => {
          loadRisk().catch(() => {});
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
      className="risk-live-panel"
    >
      {notFound && (
        <p className="text-sm text-muted">
          Not enough account activity exists yet for a risk read.
        </p>
      )}

      {!notFound && !analysis && (
        <p className="text-sm text-muted">Loading risk analysis…</p>
      )}

      {!notFound && analysis && (
        <>
          <DetailedRiskMetrics analysis={analysis} history={history} />

          {!analysis.insufficient_history && snapshot?.explanation && (
            <p className="risk-live-summary mt-3 text-sm leading-relaxed text-muted">
              {snapshot.explanation}
            </p>
          )}

          {history && (
            <details className="risk-live-trend group mt-4 border-t border-line pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.05em] text-muted">
                Recorded risk trend
                <span aria-hidden="true" className="text-base transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="mt-4 space-y-4">
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
                      {formatDelta(history.changes.var_95, formatMoney)}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted">{changeExplanation}</p>
              </div>
            </details>
          )}
        </>
      )}
    </Card>
  );
}
