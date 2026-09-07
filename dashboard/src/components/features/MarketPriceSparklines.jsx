"use client";

import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { formatMoney } from "@/lib/format";

const SPARK_WIDTH = 220;
const SPARK_HEIGHT = 44;
const PAD = 5; // keeps the 2px stroke's rounded caps from clipping at top/bottom

/**
 * One symbol's price trend, drawn from its own min/max - never a
 * shared axis across symbols (BTCUSD at ~$80k next to AAPL at ~$150 on
 * one scale would flatten AAPL to an invisible line - see
 * choosing-a-form's small-multiples guidance for exactly this case).
 * The line itself stays in ink (text-fg), not a series color - there's
 * only one series per card, so identity doesn't need a hue; success/
 * danger are reserved for the actual up/down status next to the price
 * instead. Each point carries a native <title> tooltip - a real hover
 * layer without hand-rolling crosshair tracking for what's a compact
 * trend indicator, not the page's primary chart.
 */
function Sparkline({ points }) {
  if (points.length < 2) {
    return (
      <div className="flex h-11 items-center justify-center text-xs text-muted">
        gathering data&hellip;
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = SPARK_WIDTH / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = SPARK_HEIGHT - PAD - ((p.price - min) / range) * (SPARK_HEIGHT - PAD * 2);
    return [x, y];
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1];
  const up = prices[prices.length - 1] > prices[0];
  const down = prices[prices.length - 1] < prices[0];

  return (
    <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} preserveAspectRatio="none" className="h-11 w-full overflow-visible">
      <path d={path} fill="none" className="stroke-fg" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" className={up ? "fill-success" : down ? "fill-danger" : "fill-muted"} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="transparent">
          <title>{`${formatMoney(points[i].price)} — ${new Date(points[i].ts).toLocaleTimeString()}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function PriceCard({ symbol, current, points }) {
  const first = points[0]?.price;
  const changePct = first != null && current != null && first !== 0 ? ((current - first) / first) * 100 : null;
  const up = changePct != null && changePct > 0.0001;
  const down = changePct != null && changePct < -0.0001;

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-fg">{symbol}</span>
        {changePct != null && (
          <span className={`flex items-center gap-1 text-xs font-medium ${up ? "text-success" : down ? "text-danger" : "text-muted"}`}>
            <span aria-hidden="true">{up ? "▲" : down ? "▼" : "–"}</span>
            {Math.abs(changePct).toFixed(2)}%
          </span>
        )}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-fg">{formatMoney(current)}</div>
      <div className="mt-2">
        <Sparkline points={points} />
      </div>
    </div>
  );
}

/** latest/history come from the shared useMarketPriceHistory() poll (see trader/page.js). */
export default function MarketPriceSparklines({ latest, history }) {
  const symbols = latest ? latest.map((r) => r.symbol) : [];

  return (
    <Card title="Price trend" action={<span className="text-xs text-muted">last 5 min, while this tab stays open</span>}>
      <div className="mb-3">
        <Alert tone="info">
          BTCUSD trades 24/7, so it always moves. AAPL/MSFT/GOOGL/TSLA only tick while NYSE is
          open — 9:30&nbsp;AM&ndash;4:00&nbsp;PM&nbsp;ET, Mon&ndash;Fri, which is roughly{" "}
          <b>7:00&nbsp;PM&ndash;1:30&nbsp;AM&nbsp;IST</b> (so a session that opens Monday evening IST
          runs past midnight into Tuesday, and so on through the week). Outside that window a
          symbol that hasn't ticked since the last ledger-core restart won't have a card here
          at all yet — not a bug, just no trade to show.
        </Alert>
      </div>
      {!latest || symbols.length === 0 ? (
        <p className="text-sm text-muted">No prices available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {symbols.map((symbol) => (
            <PriceCard
              key={symbol}
              symbol={symbol}
              current={latest.find((r) => r.symbol === symbol)?.price}
              points={history[symbol] || []}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
