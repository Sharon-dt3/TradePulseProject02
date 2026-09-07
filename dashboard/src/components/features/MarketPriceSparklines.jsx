"use client";

import Card from "@/components/ui/Card";
import { formatMoney } from "@/lib/format";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 104;
const CHART_PADDING = 10;
const STALE_AFTER_MS = 30000;

/**
 * Symbols supplied by the configured market-data producer. Keeping the list
 * explicit lets the UI show an honest "awaiting first quote" state following
 * a service restart or outside the equity session rather than hiding symbols.
 */
export const TRACKED_MARKET_SYMBOLS = ["BTCUSD", "AAPL", "MSFT", "GOOGL", "TSLA"];

/**
 * Draws a compact, accessible price chart for the points observed while the
 * dashboard tab has been open. No history is fabricated when the live feed
 * has not supplied a quote.
 */
export function PriceTrendChart({ symbol, points = [] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line bg-bg px-3 text-center text-xs text-muted">
        {points.length === 1 ? "Collecting the next live observation…" : "Awaiting the first live quote"}
      </div>
    );
  }

  const prices = points.map((point) => Number(point.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || Math.max(Math.abs(max) * 0.002, 1);
  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const stepX = usableWidth / (points.length - 1);
  const coordinates = prices.map((price, index) => {
    const x = CHART_PADDING + index * stepX;
    const y = CHART_HEIGHT - CHART_PADDING - ((price - min) / range) * usableHeight;
    return [x, y];
  });
  const linePath = coordinates
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${coordinates[coordinates.length - 1][0].toFixed(2)},${CHART_HEIGHT - CHART_PADDING} L${coordinates[0][0].toFixed(2)},${CHART_HEIGHT - CHART_PADDING} Z`;
  const upward = prices[prices.length - 1] >= prices[0];
  const trendColor = upward ? "var(--color-success)" : "var(--color-danger)";
  const gradientId = `trend-fill-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-24 w-full overflow-visible"
      role="img"
      aria-label={`${symbol} observed price trend`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={trendColor} stopOpacity="0.24" />
          <stop offset="100%" stopColor={trendColor} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={CHART_PADDING}
          x2={CHART_WIDTH - CHART_PADDING}
          y1={CHART_PADDING + usableHeight * ratio}
          y2={CHART_PADDING + usableHeight * ratio}
          className="stroke-line"
          strokeDasharray="3 4"
          strokeOpacity="0.8"
        />
      ))}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={trendColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coordinates.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="6" fill="transparent">
          <title>{`${formatMoney(points[index].price)} — ${new Date(points[index].ts).toLocaleTimeString()}`}</title>
        </circle>
      ))}
      <circle
        cx={coordinates[coordinates.length - 1][0]}
        cy={coordinates[coordinates.length - 1][1]}
        r="4"
        fill={trendColor}
        className="stroke-surface"
        strokeWidth="2"
      />
    </svg>
  );
}

function TrendCard({ symbol, quote, points }) {
  const first = points[0]?.price;
  const current = quote?.price;
  const changePercent =
    first != null && current != null && Number(first) !== 0
      ? ((Number(current) - Number(first)) / Number(first)) * 100
      : null;
  const stale = quote ? quote.ageMs > STALE_AFTER_MS : false;
  const up = changePercent != null && changePercent > 0.0001;
  const down = changePercent != null && changePercent < -0.0001;
  const status = !quote
    ? "Awaiting first quote"
    : stale
      ? `Last quote ${Math.round(quote.ageMs / 1000)}s ago`
      : "Live quote";

  return (
    <article className="rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-fg">{symbol}</p>
          <p className="mt-1 font-serif-display tabular-nums text-xl font-semibold text-fg">
            {current == null ? "—" : formatMoney(current)}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold ${up ? "bg-success-soft text-success" : down ? "bg-danger-soft text-danger" : "bg-bg text-muted"}`}>
          {changePercent == null ? "—" : `${up ? "+" : ""}${changePercent.toFixed(2)}%`}
        </span>
      </div>
      <div className="mt-3">
        <PriceTrendChart symbol={symbol} points={points} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={stale ? "text-warning" : "text-muted"}>{status}</span>
        <span className="text-muted">{points.length} points</span>
      </div>
    </article>
  );
}

/** Renders the rolling, client-observed trend view for all configured symbols. */
export default function MarketPriceSparklines({ latest, history }) {
  const quoteBySymbol = new Map((latest ?? []).map((quote) => [quote.symbol, quote]));
  const symbols = [...new Set([...TRACKED_MARKET_SYMBOLS, ...quoteBySymbol.keys()])];

  return (
    <Card title="Price trend" action={<span className="text-xs text-muted">observed while this tab stays open</span>}>
      <p className="mb-3 text-sm leading-relaxed text-muted">
        BTCUSD can update around the clock. U.S. equities update when the market-data feed receives a trade during the U.S. session; outside it, their latest verified quote remains visible without simulated movement.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {symbols.map((symbol) => (
          <TrendCard
            key={symbol}
            symbol={symbol}
            quote={quoteBySymbol.get(symbol)}
            points={history[symbol] ?? []}
          />
        ))}
      </div>
    </Card>
  );
}
