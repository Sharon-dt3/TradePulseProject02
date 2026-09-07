"use client";

import Card from "@/components/ui/Card";
import LiveDot from "@/components/ui/LiveDot";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatPct, formatDate, formatMoney } from "@/lib/format";
import { useRiskHistory } from "@/lib/useRiskHistory";

const SPARK_WIDTH = 220;
const SPARK_HEIGHT = 40;
const PAD = 5;

/** Same small-multiples sparkline shape as MarketPriceSparklines' own
 * Sparkline - kept as an independent copy here rather than shared,
 * deliberately, so this new analytical panel can never touch the
 * already-verified price chart component while iterating tonight. */
function TrendSparkline({ points, field, goodDirection }) {
  if (points.length < 2) {
    return <div className="flex h-10 items-center justify-center text-xs text-muted">gathering data&hellip;</div>;
  }
  const values = points.map((p) => p[field]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = SPARK_WIDTH / (points.length - 1);
  const coords = values.map((v, i) => [i * stepX, SPARK_HEIGHT - PAD - ((v - min) / range) * (SPARK_HEIGHT - PAD * 2)]);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const first = values[0];
  const last = values[values.length - 1];
  const rising = last > first;
  const falling = last < first;
  // goodDirection: "up" means rising is favorable (e.g. Sharpe), "down"
  // means rising is unfavorable (VaR, volatility) - colors the trend by
  // what it means for risk, not by raw direction alone.
  const favorable = goodDirection === "up" ? rising : falling;
  const unfavorable = goodDirection === "up" ? falling : rising;
  const dotClass = favorable ? "fill-success" : unfavorable ? "fill-danger" : "fill-muted";
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} preserveAspectRatio="none" className="h-10 w-full overflow-visible">
      <path d={path} fill="none" className="stroke-fg" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" className={dotClass} />
    </svg>
  );
}

function DeltaBadge({ current, previous, goodDirection }) {
  if (current == null || previous == null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.05) return <Badge tone="neutral">flat</Badge>;
  const rising = pct > 0;
  const favorable = goodDirection === "up" ? rising : !rising;
  return (
    <Badge tone={favorable ? "success" : "danger"}>
      {rising ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </Badge>
  );
}

/** Herfindahl-Hirschman Index on position weights (0-1): a standard
 * concentration-risk measure (sum of squared weights). 1.0 = entirely
 * one symbol, lower = more diversified. Computed client-side from data
 * the trader page already has - positions (symbol/quantity) and prices
 * (symbol/price) - same pairing PositionsTable already uses for
 * allocation %, so this stays consistent with what's shown there. */
function computeConcentration(positions, prices) {
  if (!positions || !prices || positions.length === 0) return null;
  const priced = positions
    .map((p) => {
      const quote = prices.find((r) => r.symbol === p.symbol);
      return quote ? Number(p.quantity) * Number(quote.price) : null;
    })
    .filter((v) => v !== null && v > 0);
  const total = priced.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return null;
  const hhi = priced.reduce((sum, v) => sum + (v / total) ** 2, 0);
  const largestWeight = Math.max(...priced) / total;
  return { hhi, largestWeight, symbolCount: priced.length };
}

/** Deterministic, rule-based recommendations - same spirit as
 * risk-engine's own risk_explanation.py: plain statements from real
 * numbers already on screen, never a black-box "AI suggests" claim. */
function buildRecommendations({ latest, history, concentration }) {
  const recs = [];

  if (concentration && concentration.symbolCount === 1) {
    recs.push({
      tone: "warning",
      text: `100% of holdings are in a single symbol. Adding a second, less-correlated symbol would reduce concentration risk without necessarily reducing expected return.`,
    });
  } else if (concentration && concentration.largestWeight >= 0.7) {
    recs.push({
      tone: "warning",
      text: `${formatPct(concentration.largestWeight)} of holdings sit in one symbol. Trimming that position or adding a second symbol would lower concentration risk.`,
    });
  }

  if (history.length >= 2) {
    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    if (prev.var95 > 0 && (curr.var95 - prev.var95) / prev.var95 > 0.1) {
      recs.push({
        tone: "warning",
        text: `VaR has risen more than 10% since the last update — recent trading has meaningfully increased downside exposure. Consider sizing new buys smaller until it stabilizes.`,
      });
    }
  }

  if (latest && Number(latest.sharpe) < 0) {
    recs.push({
      tone: "info",
      text: `Sharpe is negative — the risk currently being taken isn't being compensated by returns. This isn't necessarily wrong short-term, but is worth watching if it persists.`,
    });
  }

  if (recs.length === 0) {
    recs.push({ tone: "success", text: "No elevated risk signals from the current position mix or recent trend." });
  }
  return recs;
}

/** Ties the most recent fill to the risk change around it - the
 * concrete "why did this move" explanation a static number can't give.
 * Attribution is by time only (last trade vs. the risk snapshot nearest
 * before it, compared to the latest snapshot) - never a claimed causal
 * model, just "this happened, then risk moved this much." */
function buildTradeImpact(trades, history) {
  if (!trades || trades.length === 0 || history.length < 2) return null;
  const lastTrade = [...trades].sort(
    (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
  )[0];
  const tradeTs = new Date(lastTrade.executedAt).getTime();

  const before = [...history].reverse().find((p) => p.ts <= tradeTs) ?? history[0];
  const after = history[history.length - 1];
  if (before === after) return null;

  const varPct = before.var95 > 0 ? ((after.var95 - before.var95) / before.var95) * 100 : null;

  return { lastTrade, before, after, varPct };
}

/** Builds a concise, evidence-based narrative from values already displayed
 * in this panel. It describes observed changes and monitoring considerations;
 * it does not predict returns or direct a trader to buy or sell a symbol. */
function buildRiskOutlook({ history, concentration, tradeImpact }) {
  if (history.length < 2) {
    return {
      headline: "Building a baseline",
      summary:
        "A single usable risk observation is available. As new market and trade events create snapshots, this section will compare changes in downside risk, volatility, and risk-adjusted returns.",
      focus:
        "Use the current figures as a starting point and revisit this view after the next completed risk recalculation.",
    };
  }

  const previous = history[history.length - 2];
  const current = history[history.length - 1];
  const varDirection =
    current.var95 > previous.var95
      ? "increased"
      : current.var95 < previous.var95
        ? "decreased"
        : "held steady";
  const volatilityDirection =
    current.volatility > previous.volatility
      ? "widened"
      : current.volatility < previous.volatility
        ? "narrowed"
        : "held steady";
  const sharpeDirection =
    current.sharpe > previous.sharpe
      ? "improved"
      : current.sharpe < previous.sharpe
        ? "weakened"
        : "held steady";
  const riskRising = varDirection === "increased" || volatilityDirection === "widened";
  const concentrationNote =
    concentration?.symbolCount === 1
      ? "Your priced holdings are currently concentrated in one symbol, so its price movement has an outsized effect on the portfolio."
      : concentration?.largestWeight >= 0.7
        ? `Your largest priced holding represents ${formatPct(concentration.largestWeight)} of holdings, making that symbol the primary concentration to monitor.`
        : concentration
          ? `Exposure is spread across ${concentration.symbolCount} priced holding${concentration.symbolCount === 1 ? "" : "s"}, with no single holding above 70%.`
          : "Current concentration cannot be calculated until positions receive live quotes.";
  const tradeNote = tradeImpact
    ? `The latest observed execution was ${tradeImpact.lastTrade.side} ${formatNumber(tradeImpact.lastTrade.quantity)} ${tradeImpact.lastTrade.symbol}. The following snapshots show VaR ${tradeImpact.varPct === null ? "updated after that trade" : `${tradeImpact.varPct >= 0 ? "rose" : "fell"} ${Math.abs(tradeImpact.varPct).toFixed(1)}%`}—an observed sequence, not a claim that the trade alone caused the move.`
    : "No recent execution can be directly paired with the recorded risk movement yet.";

  return {
    headline: riskRising ? "Risk needs closer monitoring" : "Risk trend is stable or improving",
    summary: `Since the previous recorded snapshot, estimated downside risk ${varDirection}, portfolio swings ${volatilityDirection}, and risk-adjusted returns ${sharpeDirection}.`,
    focus: `${concentrationNote} ${tradeNote}`,
  };
}

/** positions/prices: same shape the trader page already passes to
 * PositionsTable - {symbol, quantity}[] and {symbol, price}[]. trades:
 * same shape passed to TradesTable - used only to attribute the most
 * recent risk change to the trade that likely drove it. */
export default function RiskAnalysisPanel({ positions, prices, trades }) {
  const { latest, history, notFound, liveConnected } = useRiskHistory();
  const concentration = computeConcentration(positions, prices);
  const prevPoint = history.length >= 2 ? history[history.length - 2] : null;
  const currPoint = history.length >= 1 ? history[history.length - 1] : null;
  const tradeImpact = buildTradeImpact(trades, history);
  const outlook = latest
    ? buildRiskOutlook({ history, concentration, tradeImpact })
    : null;

  return (
    <Card title="Risk analysis" action={<LiveDot connected={liveConnected} />}>
      {notFound && <p className="text-sm text-muted">Not enough activity yet for a risk read.</p>}
      {!notFound && !latest && <p className="text-sm text-muted">Loading…</p>}

      {!notFound && latest && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { key: "var95", label: "VaR (95%) trend", goodDirection: "down" },
              { key: "volatility", label: "Volatility trend", goodDirection: "down" },
              { key: "sharpe", label: "Sharpe trend", goodDirection: "up" },
            ].map((m) => (
              <div key={m.key} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">{m.label}</span>
                  <DeltaBadge
                    current={currPoint?.[m.key]}
                    previous={prevPoint?.[m.key]}
                    goodDirection={m.goodDirection}
                  />
                </div>
                <div className="mt-1 font-serif-display tabular-nums text-lg font-semibold text-fg">
                  {formatNumber(currPoint?.[m.key])}
                </div>
                <div className="mt-1">
                  <TrendSparkline points={history} field={m.key} goodDirection={m.goodDirection} />
                </div>
              </div>
            ))}
          </div>

          {outlook && (
            <section
              aria-labelledby="risk-outlook-heading"
              className="rounded-xl border border-primary/20 bg-primary-soft p-4"
            >
              <p
                id="risk-outlook-heading"
                className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-primary"
              >
                Risk outlook
              </p>
              <h4 className="mt-2 text-base font-semibold text-fg">{outlook.headline}</h4>
              <p className="mt-2 text-sm leading-relaxed text-fg">{outlook.summary}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{outlook.focus}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                This is an informational interpretation of recorded account data, not investment advice or a performance forecast.
              </p>
            </section>
          )}

          {concentration && (
            <div className="rounded-lg border border-line p-3">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
                Concentration risk
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-serif-display tabular-nums text-lg font-semibold text-fg">
                  {formatNumber(concentration.hhi, 2)}
                </span>
                <span className="text-xs text-muted">
                  HHI (0–1, higher = more concentrated) · largest position is {formatPct(concentration.largestWeight)} of holdings
                </span>
              </div>
            </div>
          )}

          {tradeImpact && (
            <div className="rounded-lg border border-info/25 bg-info-bg p-3 text-sm text-info">
              <span className="font-medium">Last trade context: </span>
              {tradeImpact.lastTrade.side} {formatNumber(tradeImpact.lastTrade.quantity)} {tradeImpact.lastTrade.symbol} at{" "}
              {formatMoney(tradeImpact.lastTrade.price)} ({formatDate(tradeImpact.lastTrade.executedAt)}).
            </div>
          )}

          <div>
            <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
              What this means
            </div>
            <div className="space-y-2">
              {buildRecommendations({ latest, history, concentration }).map((r, i) => (
                <div
                  key={i}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    r.tone === "warning"
                      ? "border-warning/25 bg-warning-bg text-warning"
                      : r.tone === "success"
                        ? "border-success/25 bg-success-bg text-success"
                        : "border-info/25 bg-info-bg text-info"
                  }`}
                >
                  {r.text}
                </div>
              ))}
            </div>
          </div>

          {latest.computedAt && (
            <p className="text-xs text-muted">Last snapshot: {formatDate(latest.computedAt)} · trend built from this session's live updates only</p>
          )}
        </div>
      )}
    </Card>
  );
}
