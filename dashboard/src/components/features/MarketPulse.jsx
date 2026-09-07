"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import { PriceTrendChart, TRACKED_MARKET_SYMBOLS } from "@/components/features/MarketPriceSparklines";
import { formatMoney } from "@/lib/format";

const STALE_AFTER_MS = 30000;
const WATCHLIST_STORAGE_KEY = "tradepulse-market-pulse-watchlist";
const ALERT_STORAGE_KEY = "tradepulse-market-pulse-alerts";

function isUsMarketOpen() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hour, minute] = time.split(":").map(Number);
  const minutes = hour * 60 + minute;

  return !["Sat", "Sun"].includes(weekday) && minutes >= 570 && minutes < 960;
}

function quoteSource(symbol, simulated) {
  if (simulated) return "Simulated demo data";
  return symbol === "BTCUSD" ? "Coinbase Exchange" : "Finnhub";
}

function quoteStatus(quote) {
  if (!quote) return { label: "Awaiting feed", tone: "neutral" };
  if (quote.simulated) return { label: "Simulated", tone: "warning" };
  if (quote.ageMs > STALE_AFTER_MS) return { label: "Stale", tone: "warning" };
  return { label: "Live", tone: "success" };
}

function movementFor(points, quote) {
  const start = points[0]?.price;
  if (start == null || quote?.price == null || Number(start) === 0) return null;
  return ((Number(quote.price) - Number(start)) / Number(start)) * 100;
}

function formatMovement(movement) {
  if (movement == null) return "—";
  return `${movement > 0 ? "+" : ""}${movement.toFixed(2)}%`;
}

function MarketPulseCard({
  symbol,
  quote,
  points,
  pinned,
  onSelect,
  onToggleWatchlist,
  onMoveWatchlist,
  canMoveUp,
  canMoveDown,
}) {
  const status = quoteStatus(quote);
  const movement = movementFor(points, quote);
  const recentMovement =
    points.length > 1
      ? Number(points[points.length - 1].price) - Number(points[points.length - 2].price)
      : null;
  const movementTone =
    movement > 0 ? "text-success" : movement < 0 ? "text-danger" : "text-muted";

  return (
    <article className="rounded-xl border border-line bg-bg p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelect(symbol)}
          className="min-w-0 text-left"
          aria-label={`Open ${symbol} quote details`}
        >
          <p className="font-mono text-sm font-semibold text-fg">{symbol}</p>
          <p className="mt-1 font-serif-display tabular-nums text-xl font-semibold text-fg">
            {quote ? formatMoney(quote.price) : "—"}
          </p>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleWatchlist(symbol)}
            aria-pressed={pinned}
            aria-label={pinned ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
            className={`rounded-md px-2 py-1 text-sm ${pinned ? "bg-warning-bg text-warning" : "text-muted hover:bg-primary-soft"}`}
          >
            {pinned ? "★" : "☆"}
          </button>
          {pinned && (
            <div className="flex rounded-md border border-line bg-surface">
              <button type="button" onClick={() => onMoveWatchlist(symbol, -1)} disabled={!canMoveUp} className="px-1.5 py-1 text-xs text-muted disabled:opacity-30" aria-label={`Move ${symbol} earlier in watchlist`}>↑</button>
              <button type="button" onClick={() => onMoveWatchlist(symbol, 1)} disabled={!canMoveDown} className="border-l border-line px-1.5 py-1 text-xs text-muted disabled:opacity-30" aria-label={`Move ${symbol} later in watchlist`}>↓</button>
            </div>
          )}
        </div>
      </div>

      <button type="button" onClick={() => onSelect(symbol)} className="mt-3 block w-full text-left" aria-label={`View ${symbol} trend`}>
        <PriceTrendChart symbol={symbol} points={points} />
      </button>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={`font-semibold ${movementTone}`}>{formatMovement(movement)}</span>
        <span className={recentMovement > 0 ? "text-success" : recentMovement < 0 ? "text-danger" : "text-muted"}>
          {recentMovement == null ? "Collecting ticks" : recentMovement > 0 ? "↑ latest tick" : recentMovement < 0 ? "↓ latest tick" : "• unchanged"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        <span className="text-xs text-muted">{quote ? `${Math.round(quote.ageMs / 1000)}s ago` : "No quote"}</span>
      </div>
    </article>
  );
}

/**
 * Renders interactive, client-observed market context for supported symbols.
 * Watchlist and threshold alerts remain local to this browser because the
 * current application has no server-side watchlist or notification API.
 */
export default function MarketPulse({ prices, history, demoEquitiesEnabled, onTrade }) {
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDirection, setAlertDirection] = useState("above");
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [comparison, setComparison] = useState(["BTCUSD", "AAPL"]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    try {
      setWatchlist(JSON.parse(window.localStorage.getItem(WATCHLIST_STORAGE_KEY)) ?? []);
      setAlerts(JSON.parse(window.localStorage.getItem(ALERT_STORAGE_KEY)) ?? []);
    } catch {
      setWatchlist([]);
      setAlerts([]);
    }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [preferencesLoaded, watchlist]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts, preferencesLoaded]);

  const quoteBySymbol = useMemo(
    () => new Map((prices ?? []).map((quote) => [quote.symbol, quote])),
    [prices],
  );
  const availableSymbols = useMemo(
    () => [...new Set([...TRACKED_MARKET_SYMBOLS, ...quoteBySymbol.keys()])],
    [quoteBySymbol],
  );
  const orderedSymbols = useMemo(() => {
    const pinned = watchlist.filter((symbol) => availableSymbols.includes(symbol));
    return [...pinned, ...availableSymbols.filter((symbol) => !pinned.includes(symbol))];
  }, [availableSymbols, watchlist]);

  useEffect(() => {
    const newlyTriggered = alerts.filter((alert) => {
      const quote = quoteBySymbol.get(alert.symbol);
      if (!quote || alert.triggered) return false;
      return alert.direction === "above"
        ? Number(quote.price) >= Number(alert.price)
        : Number(quote.price) <= Number(alert.price);
    });
    if (!newlyTriggered.length) return;

    setAlerts((current) =>
      current.map((alert) =>
        newlyTriggered.some((triggered) => triggered.id === alert.id)
          ? { ...alert, triggered: true }
          : alert,
      ),
    );
    setTriggeredAlerts((current) => [...current, ...newlyTriggered]);
  }, [alerts, quoteBySymbol]);

  const selectedQuote = selectedSymbol ? quoteBySymbol.get(selectedSymbol) : null;
  const selectedPoints = selectedSymbol ? history[selectedSymbol] ?? [] : [];
  const selectedStatus = quoteStatus(selectedQuote);
  const selectedMovement = movementFor(selectedPoints, selectedQuote);
  const values = selectedPoints.map((point) => Number(point.price));
  const open = values[0];
  const high = values.length ? Math.max(...values) : null;
  const low = values.length ? Math.min(...values) : null;
  const rangeHasEnoughData = selectedPoints.length >= 2;

  const toggleWatchlist = (symbol) => {
    setWatchlist((current) =>
      current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol],
    );
  };

  const moveWatchlist = (symbol, direction) => {
    setWatchlist((current) => {
      const index = current.indexOf(symbol);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const addAlert = () => {
    const price = Number(alertPrice);
    if (!selectedSymbol || !Number.isFinite(price) || price <= 0) return;
    setAlerts((current) => [
      ...current,
      { id: crypto.randomUUID(), symbol: selectedSymbol, price, direction: alertDirection, triggered: false },
    ]);
    setAlertPrice("");
  };

  const comparisonQuotes = comparison.map((symbol) => quoteBySymbol.get(symbol));
  const comparisonMovements = comparison.map((symbol, index) =>
    movementFor(history[symbol] ?? [], comparisonQuotes[index]),
  );

  return (
    <div>
      {triggeredAlerts.length > 0 && (
        <div className="mb-3 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
          {triggeredAlerts.map((alert) => `${alert.symbol} is ${alert.direction} ${formatMoney(alert.price)}`).join(" • ")}
          <button type="button" onClick={() => setTriggeredAlerts([])} className="ml-2 font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Price trends reflect quotes observed while this tab remains open.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={isUsMarketOpen() ? "success" : "neutral"}>
            {isUsMarketOpen() ? "U.S. session open" : "U.S. session closed"}
          </Badge>
          <span className="text-xs text-muted">{demoEquitiesEnabled ? "Local demo equities are labeled" : "Live quote monitor"}</span>
        </div>
      </div>

      {!prices && !demoEquitiesEnabled ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-xl bg-line/60" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orderedSymbols.map((symbol) => {
            const pinnedIndex = watchlist.indexOf(symbol);
            return (
              <MarketPulseCard
                key={symbol}
                symbol={symbol}
                quote={quoteBySymbol.get(symbol)}
                points={history[symbol] ?? []}
                pinned={pinnedIndex >= 0}
                canMoveUp={pinnedIndex > 0}
                canMoveDown={pinnedIndex >= 0 && pinnedIndex < watchlist.length - 1}
                onSelect={setSelectedSymbol}
                onToggleWatchlist={toggleWatchlist}
                onMoveWatchlist={moveWatchlist}
              />
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-line bg-bg p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted">Compare observed movement</p>
          <span className="text-xs text-muted">All quotes observed in this tab</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {comparison.map((symbol, index) => (
            <select
              key={index}
              value={symbol}
              onChange={(event) => setComparison((current) => current.map((item, position) => position === index ? event.target.value : item))}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-fg"
              aria-label={`Comparison symbol ${index + 1}`}
            >
              {availableSymbols.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {comparison.map((symbol, index) => (
            <div key={`${symbol}-${index}`} className="rounded-md bg-surface px-3 py-2">
              <p className="font-mono text-xs font-semibold text-fg">{symbol}</p>
              <p className={`mt-1 text-sm font-semibold ${comparisonMovements[index] > 0 ? "text-success" : comparisonMovements[index] < 0 ? "text-danger" : "text-muted"}`}>
                {formatMovement(comparisonMovements[index])}
              </p>
            </div>
          ))}
        </div>
      </div>

      {selectedSymbol && (
        <div className="mt-4 rounded-xl border border-primary/25 bg-primary-soft/35 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-base font-semibold text-fg">{selectedSymbol}</p>
              <p className="mt-1 font-serif-display tabular-nums text-2xl font-semibold text-fg">
                {selectedQuote ? formatMoney(selectedQuote.price) : "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge tone={selectedStatus.tone}>{selectedStatus.label}</Badge>
              {selectedQuote?.simulated && <Badge tone="warning">Demo only</Badge>}
            </div>
          </div>

          <div className="mt-4">
            <PriceTrendChart symbol={`${selectedSymbol}-detail`} points={selectedPoints} />
          </div>
          {!rangeHasEnoughData && (
            <p className="mt-2 text-xs text-muted">
              More observations are needed for this range. The dashboard retains only client-observed history while this tab is open.
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Open", open == null ? "—" : formatMoney(open)],
              ["High", high == null ? "—" : formatMoney(high)],
              ["Low", low == null ? "—" : formatMoney(low)],
              ["Movement", formatMovement(selectedMovement)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-surface px-3 py-2">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.05em] text-muted">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-fg">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-xs text-muted">
            Source: {quoteSource(selectedSymbol, selectedQuote?.simulated)} • Last updated: {selectedQuote ? `${Math.round(selectedQuote.ageMs / 1000)} seconds ago` : "awaiting quote"}
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-3">
            <label className="min-w-36 flex-1 text-xs text-muted">
              Local price alert
              <input value={alertPrice} onChange={(event) => setAlertPrice(event.target.value)} type="number" min="0.00000001" step="any" placeholder="Threshold" className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-fg" />
            </label>
            <select value={alertDirection} onChange={(event) => setAlertDirection(event.target.value)} className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-fg" aria-label="Alert direction">
              <option value="above">Moves above</option>
              <option value="below">Moves below</option>
            </select>
            <button type="button" onClick={addAlert} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-primary-soft">Add alert</button>
            <button type="button" onClick={() => onTrade(selectedSymbol)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90">Trade</button>
          </div>

          {alerts.filter((alert) => alert.symbol === selectedSymbol && !alert.triggered).length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {alerts.filter((alert) => alert.symbol === selectedSymbol && !alert.triggered).map((alert) => (
                <li key={alert.id}>
                  Alert when price moves {alert.direction} {formatMoney(alert.price)}
                  <button type="button" onClick={() => setAlerts((current) => current.filter((item) => item.id !== alert.id))} className="ml-2 text-danger underline">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
