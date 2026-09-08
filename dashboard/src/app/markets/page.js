"use client";

import Link from "next/link";
import { useState } from "react";
import RequireRole from "@/components/RequireRole";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { formatMoney } from "@/lib/format";
import { useMarketPriceHistory } from "@/lib/useMarketPriceHistory";
import AnimatedMarketBackdrop from "@/components/ui/AnimatedMarketBackdrop";

function isUsMarketOpen() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(new Date());
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const [hour, minute] = time.split(":").map(Number);
  const minutes = hour * 60 + minute;

  return !["Sat", "Sun"].includes(weekday) && minutes >= 570 && minutes < 960;
}

function QuoteDetail({ quote, history }) {
  const points = history[quote.symbol] ?? [];
  const start = points[0]?.price;
  const movement =
    start && start !== 0
      ? ((Number(quote.price) - Number(start)) / Number(start)) * 100
      : null;
  const stale = quote.ageMs > 30000;
  const marketOpen = isUsMarketOpen();

  return (
    <Card title="Selected symbol">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-semibold text-fg">{quote.symbol}</p>
          <p className="mt-1 font-serif-display tabular-nums text-3xl font-semibold text-fg">
            {formatMoney(quote.price)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={marketOpen ? "success" : "neutral"}>
            {marketOpen ? "U.S. session open" : "U.S. session closed"}
          </Badge>
          <Badge tone={stale ? "warning" : "info"}>
            {stale ? "Quote may be stale" : "Current quote"}
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-bg p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
            Observed movement
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              movement > 0
                ? "text-success"
                : movement < 0
                  ? "text-danger"
                  : "text-fg"
            }`}
          >
            {movement === null
              ? "Gathering data"
              : `${movement > 0 ? "+" : ""}${movement.toFixed(2)}%`}
          </p>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
            Quote freshness
          </p>
          <p className={`mt-1 text-lg font-semibold ${stale ? "text-warning" : "text-fg"}`}>
            {Math.round(quote.ageMs / 1000)}s ago
          </p>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
            Observed points
          </p>
          <p className="mt-1 text-lg font-semibold text-fg">{points.length}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-bg px-4 py-3 text-sm text-muted">
        {stale
          ? "This quote is older than 30 seconds. Refresh or wait for a current quote before placing an order."
          : "Quote data refreshes while this page remains open."}
      </div>

      <Link
        href="/trader#place-order"
        className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90"
      >
        Trade this supported symbol
      </Link>
    </Card>
  );
}

function MarketsWorkspace() {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const { latest: prices, history } = useMarketPriceHistory();
  const selectedQuote = prices?.find((quote) => quote.symbol === selectedSymbol);

  return (
    <div className="animated-market-workspace">
      <AnimatedMarketBackdrop />
      <div className="animated-market-content">
      <PageHeader
        title="Markets"
        subtitle="Review current live quotes and open the supported order workflow."
        action={
          <Link
            href="/trader"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90"
          >
            Open Trader
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card
          title="Live quote explorer"
          action={
            <Badge tone={isUsMarketOpen() ? "success" : "neutral"}>
              {isUsMarketOpen() ? "U.S. session open" : "U.S. session closed"}
            </Badge>
          }
        >
          {!prices ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-line/60" />
              ))}
            </div>
          ) : prices.length === 0 ? (
            <div className="rounded-lg bg-bg p-5 text-center">
              <p className="font-medium text-fg">Waiting for market data</p>
              <p className="mt-1 text-sm text-muted">
                Supported symbols will appear here when the configured feed sends a quote.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {prices.map((quote) => {
                const stale = quote.ageMs > 30000;
                const selected = selectedSymbol === quote.symbol;

                return (
                  <button
                    key={quote.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(quote.symbol)}
                    aria-pressed={selected}
                    className={`rounded-xl border p-4 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
                      selected ? "border-primary bg-primary-soft" : "border-line bg-bg"
                    }`}
                  >
                    <p className="font-mono text-sm font-semibold text-fg">{quote.symbol}</p>
                    <p className="mt-1 font-serif-display tabular-nums text-xl font-semibold text-fg">
                      {formatMoney(quote.price)}
                    </p>
                    <p className={`mt-2 text-xs ${stale ? "text-warning" : "text-muted"}`}>
                      {stale ? "Quote may be stale" : `${Math.round(quote.ageMs / 1000)}s ago`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {selectedQuote ? (
          <QuoteDetail quote={selectedQuote} history={history} />
        ) : (
          <Card title="Select a symbol">
            <div className="flex min-h-52 flex-col justify-center rounded-lg bg-bg p-5 text-center">
              <p className="font-medium text-fg">Choose a live quote</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Review price, observed movement, freshness, and market-session context
                before opening the supported order workflow.
              </p>
            </div>
          </Card>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Quotes are supplied by the configured market-data feed. Orders are limited to
        symbols supported by the existing market and limit-order workflow.
      </p>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <RequireRole roles={["trader"]}>
      <MarketsWorkspace />
    </RequireRole>
  );
}
