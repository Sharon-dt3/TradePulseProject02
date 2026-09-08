"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";

const STALE_AFTER_MS = 30000;

function quoteFor(prices, symbol) {
  return prices?.find((price) => price.symbol === symbol);
}

function observedMovement(points, quote) {
  const openingPrice = Number(points?.[0]?.price);
  const currentPrice = Number(quote?.price);
  if (!Number.isFinite(openingPrice) || !Number.isFinite(currentPrice) || openingPrice === 0) return null;
  return (currentPrice - openingPrice) / openingPrice;
}

function Movement({ value }) {
  const tone = value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted";
  return (
    <span className={`font-semibold tabular-nums ${tone}`}>
      {value === null ? "Collecting data" : `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`}
    </span>
  );
}

function MetricCard({ label, value, detail, tone = "text-fg", variant, icon }) {
  return (
    <div
      className={`portfolio-command-center-metric rounded-xl border border-line bg-bg/70 p-3 ${
        variant ? `portfolio-command-center-metric-${variant}` : ""
      }`}
    >
      {icon && <span className="portfolio-command-center-metric-icon" aria-hidden="true">{icon}</span>}
      <p className="portfolio-command-center-metric-label text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={`portfolio-command-center-metric-value mt-1 font-serif-display text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="portfolio-command-center-metric-detail mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

/**
 * Renders a decision-focused portfolio summary from the current account,
 * quote, position, and browser-session history already available to Trader.
 * It intentionally labels session-only quote movement and does not calculate
 * cost basis, realized P/L, or unsupported long-term performance.
 */
export default function PortfolioCommandCenter({
  account,
  positions = [],
  prices = [],
  history = {},
  orders = [],
  trades = [],
  onTrade,
}) {
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  const holdings = useMemo(() => {
    const priced = positions.map((position) => {
      const quote = quoteFor(prices, position.symbol);
      const marketValue = quote ? Number(position.quantity) * Number(quote.price) : null;
      const movement = observedMovement(history[position.symbol], quote);

      return {
        ...position,
        quote,
        marketValue,
        movement,
        observations: history[position.symbol]?.length ?? 0,
      };
    });
    const holdingsValue = priced.reduce((total, position) => total + (position.marketValue ?? 0), 0);

    return {
      holdingsValue,
      positions: priced
        .map((position) => ({
          ...position,
          allocation: holdingsValue > 0 && position.marketValue !== null ? position.marketValue / holdingsValue : null,
        }))
        .sort((left, right) => (right.marketValue ?? -1) - (left.marketValue ?? -1)),
    };
  }, [history, positions, prices]);

  const selectedPosition = holdings.positions.find((position) => position.symbol === selectedSymbol) ?? null;
  const cash = Number(account?.cashBalance ?? 0);
  const portfolioValue = cash + holdings.holdingsValue;
  const activeOrders = orders.filter((order) => order.status === "WORKING");
  const liveQuotes = prices.filter((quote) => Number(quote.ageMs) <= STALE_AFTER_MS).length;
  const movers = [...holdings.positions]
    .filter((position) => position.movement !== null)
    .sort((left, right) => Math.abs(right.movement) - Math.abs(left.movement))
    .slice(0, 3);
  const selectedTrades = selectedSymbol
    ? trades.filter((trade) => trade.symbol === selectedSymbol).slice(0, 3)
    : [];

  if (!account) {
    return (
      <Card title="Portfolio command center" action={<Badge tone="info">Loading account</Badge>}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-line/60" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Portfolio command center"
        action={<Badge tone={account.frozen ? "danger" : "success"}>{account.frozen ? "Trading restricted" : "Account active"}</Badge>}
        className="portfolio-command-center"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Portfolio value" value={formatMoney(portfolioValue)} detail="Cash plus quoted holdings" variant="portfolio" icon="◈" />
          <MetricCard label="Cash available" value={formatMoney(cash)} detail={cash < 0 ? "Review buying power" : "Available before settlement"} tone={cash < 0 ? "text-danger" : "text-fg"} variant={cash < 0 ? "cash-warning" : "cash"} icon="$" />
          <MetricCard label="Holdings" value={formatMoney(holdings.holdingsValue)} detail={`${holdings.positions.length} open position${holdings.positions.length === 1 ? "" : "s"}`} variant="holdings" icon="◫" />
          <MetricCard label="Open orders" value={formatNumber(activeOrders.length, 0)} detail={activeOrders.length ? "Working instructions" : "No active instructions"} variant="orders" icon="↗" />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(14rem,0.9fr)]">
          <section aria-labelledby="holdings-heading">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h4 id="holdings-heading" className="text-sm font-semibold text-fg">Holdings at a glance</h4>
                <p className="mt-0.5 text-xs text-muted">Select a position for quote details, activity, and trade actions.</p>
              </div>
              <span className="text-xs text-muted">{liveQuotes}/{prices.length} live quotes</span>
            </div>

            {holdings.positions.length ? (
              <div className="space-y-2">
                {holdings.positions.slice(0, 5).map((position) => (
                  <button
                    key={position.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(position.symbol)}
                    className="grid w-full grid-cols-[minmax(4rem,0.7fr)_minmax(4rem,0.8fr)_minmax(5rem,1fr)_minmax(4rem,0.65fr)_auto] items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2.5 text-left transition hover:border-primary/30 hover:bg-primary-soft/50"
                  >
                    <span>
                      <span className="block font-mono text-sm font-semibold text-fg">{position.symbol}</span>
                      <span className="mt-0.5 block text-xs text-muted">{formatNumber(position.quantity)} units</span>
                    </span>
                    <span className="text-right text-sm font-medium tabular-nums text-fg">{position.quote ? formatMoney(position.quote.price) : "No quote"}</span>
                    <span className="text-right text-sm font-semibold tabular-nums text-fg">{formatMoney(position.marketValue)}</span>
                    <span className="text-right text-xs"><Movement value={position.movement} /></span>
                    <span className="text-xs text-primary">Details →</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-bg px-4 py-8 text-center">
                <p className="font-medium text-fg">No open positions yet</p>
                <p className="mt-1 text-sm text-muted">Use the market pulse or order ticket to explore the supported symbols.</p>
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-line bg-bg p-3" aria-labelledby="market-movers-heading">
            <h4 id="market-movers-heading" className="text-sm font-semibold text-fg">Observed movers</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">Movement is based only on quotes observed while this tab has remained open.</p>
            {movers.length ? (
              <div className="mt-3 space-y-2">
                {movers.map((position) => (
                  <button key={position.symbol} type="button" onClick={() => setSelectedSymbol(position.symbol)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-primary-soft">
                    <span>
                      <span className="block font-mono text-sm font-semibold text-fg">{position.symbol}</span>
                      <span className="text-xs text-muted">{position.observations} observed quotes</span>
                    </span>
                    <Movement value={position.movement} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">More observed price updates are needed to identify movers.</p>
            )}
          </aside>
        </div>
      </Card>

      <Modal
        open={Boolean(selectedPosition)}
        title={selectedPosition ? `${selectedPosition.symbol} position details` : "Position details"}
        onClose={() => setSelectedSymbol(null)}
        footer={
          selectedPosition && (
            <>
              <Button type="button" variant="secondary" onClick={() => setSelectedSymbol(null)}>Close</Button>
              <Button type="button" onClick={() => { onTrade(selectedPosition.symbol); setSelectedSymbol(null); }}>Trade {selectedPosition.symbol}</Button>
            </>
          )
        }
      >
        {selectedPosition && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Quantity" value={formatNumber(selectedPosition.quantity)} detail="Current net position" />
              <MetricCard label="Market value" value={formatMoney(selectedPosition.marketValue)} detail={selectedPosition.quote ? `${Math.round(Number(selectedPosition.quote.ageMs) / 1000)}s quote age` : "No current quote"} />
              <MetricCard label="Allocation" value={formatPct(selectedPosition.allocation)} detail="Of quoted holdings" />
              <MetricCard label="Session movement" value={selectedPosition.movement === null ? "—" : `${selectedPosition.movement > 0 ? "+" : ""}${(selectedPosition.movement * 100).toFixed(2)}%`} detail="Observed while this tab is open" tone={selectedPosition.movement > 0 ? "text-success" : selectedPosition.movement < 0 ? "text-danger" : "text-fg"} />
            </div>

            <section>
              <h4 className="text-sm font-semibold text-fg">Recent executions</h4>
              {selectedTrades.length ? (
                <ul className="mt-2 space-y-2">
                  {selectedTrades.map((trade) => (
                    <li key={trade.tradeId} className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm">
                      <span><Badge tone={trade.side === "BUY" ? "success" : "danger"}>{trade.side}</Badge> <span className="ml-2 text-muted">{formatNumber(trade.quantity)} units</span></span>
                      <span className="font-medium tabular-nums text-fg">{formatMoney(trade.price)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted">No executions for this symbol are currently available.</p>
              )}
            </section>
          </div>
        )}
      </Modal>
    </>
  );
}
