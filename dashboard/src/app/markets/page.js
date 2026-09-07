"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import RequireRole from "@/components/RequireRole";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { formatMoney } from "@/lib/format";
import { useMarketPriceHistory } from "@/lib/useMarketPriceHistory";

const FILTERS = ["All", "Available now", "Planned", "Approval required", "Monitor only"];

const INVESTMENT_OPTIONS = [
  {
    title: "Individual stocks & ETFs",
    status: "Available now",
    tone: "success",
    eligibility: "An active trading account and a current quote for the selected symbol.",
    risk: "Prices can change quickly; market orders have no guaranteed execution price.",
    nextStep: "Explore a live quote below, then open Trader to submit a supported order.",
  },
  {
    title: "Government, municipal & corporate bonds",
    status: "Planned",
    tone: "info",
    eligibility: "Requires instrument terms, pricing or inventory, settlement handling, and suitability disclosures.",
    risk: "Interest-rate, credit, liquidity, and call risks vary by individual bond.",
    nextStep: "Fixed-income product data and execution controls must be enabled first.",
  },
  {
    title: "CDs, Treasury bills, money-market funds & cash",
    status: "Planned",
    tone: "info",
    eligibility: "Requires product terms, account servicing, and settlement processes.",
    risk: "Rates, liquidity, insurance coverage, and maturity terms vary by product.",
    nextStep: "Cash-management product support must be enabled first.",
  },
  {
    title: "Retirement & target-date portfolios",
    status: "Planned",
    tone: "info",
    eligibility: "Requires retirement-account eligibility, contribution handling, and portfolio data.",
    risk: "Target-date allocations can lose value and may not match every investor's needs.",
    nextStep: "Retirement account and product capabilities must be established first.",
  },
  {
    title: "Managed & robo-advised portfolios",
    status: "Planned",
    tone: "info",
    eligibility: "Requires an advisory workflow, investment objectives, rebalancing rules, and disclosures.",
    risk: "Managed strategies do not guarantee performance and can involve fees.",
    nextStep: "Advisory and portfolio-management capabilities must be enabled first.",
  },
  {
    title: "Options strategies",
    status: "Approval required",
    tone: "warning",
    eligibility: "Would require account approval, suitability review, option-chain data, and dedicated risk controls.",
    risk: "Options can expire worthless and may result in substantial losses.",
    nextStep: "Options are not enabled. Approval and execution controls must be implemented first.",
  },
  {
    title: "REITs, commodities & selected alternatives",
    status: "Planned",
    tone: "info",
    eligibility: "Requires product-specific data, permissions, disclosures, and regulatory review.",
    risk: "Alternative products can have complex pricing, liquidity, and concentration risks.",
    nextStep: "Product-specific controls must be enabled before access is offered.",
  },
  {
    title: "Crypto-related products",
    status: "Monitor only",
    tone: "warning",
    eligibility: "Selected related symbols may appear in the configured market-data feed.",
    risk: "Crypto-related markets can be highly volatile and may have limited liquidity.",
    nextStep: "Use live quote monitoring below; availability does not imply custody or execution.",
  },
];

function isMarketOpen() {
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
  const change = start && start !== 0 ? ((Number(quote.price) - start) / Number(start)) * 100 : null;
  const stale = quote.ageMs > 30000;
  const marketOpen = isMarketOpen();

  return (
    <Card title="Selected symbol">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-semibold text-fg">{quote.symbol}</p>
          <p className="mt-1 font-serif-display tabular-nums text-3xl font-semibold text-fg">{formatMoney(quote.price)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={marketOpen ? "success" : "neutral"}>{marketOpen ? "U.S. session open" : "U.S. session closed"}</Badge>
          <Badge tone={stale ? "warning" : "info"}>{stale ? "Quote may be stale" : "Current quote"}</Badge>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-bg p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">Session movement</p>
          <p className={`mt-1 text-lg font-semibold ${change > 0 ? "text-success" : change < 0 ? "text-danger" : "text-fg"}`}>
            {change === null ? "Gathering data" : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`}
          </p>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">Quote freshness</p>
          <p className={`mt-1 text-lg font-semibold ${stale ? "text-warning" : "text-fg"}`}>{Math.round(quote.ageMs / 1000)}s ago</p>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">Observed points</p>
          <p className="mt-1 text-lg font-semibold text-fg">{points.length}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-line bg-bg px-4 py-3 text-sm text-muted">
        {stale
          ? "The latest quote is older than 30 seconds. Review quote freshness before making a trading decision."
          : "Quote data is refreshing while this page remains open."}
      </div>
      <Link href="/trader#place-order" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90">
        Trade this symbol
      </Link>
    </Card>
  );
}

function MarketsWorkspace() {
  const [filter, setFilter] = useState("All");
  const [selectedOption, setSelectedOption] = useState(INVESTMENT_OPTIONS[0]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const { latest: prices, history } = useMarketPriceHistory();

  const options = useMemo(
    () => INVESTMENT_OPTIONS.filter((option) => filter === "All" || option.status === filter),
    [filter]
  );
  const selectedQuote = prices?.find((quote) => quote.symbol === selectedSymbol);

  return (
    <div>
      <PageHeader
        title="Markets"
        subtitle="Explore product access, select a live quote, and understand the next step before you trade."
        action={
          <Link href="/trader" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90">
            Open Trader
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card title="Investment marketplace">
          <div className="flex flex-wrap gap-2" aria-label="Filter investment products">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === item ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:bg-primary-soft hover:text-fg"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {options.map((option) => (
              <button
                key={option.title}
                type="button"
                onClick={() => setSelectedOption(option)}
                aria-pressed={selectedOption.title === option.title}
                className={`rounded-xl border p-4 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
                  selectedOption.title === option.title ? "border-primary bg-primary-soft" : "border-line bg-bg"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold text-fg">{option.title}</h2>
                  <Badge tone={option.tone}>{option.status}</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{option.nextStep}</p>
              </button>
            ))}
          </div>
          {!options.length && <p className="mt-5 rounded-lg bg-bg p-4 text-sm text-muted">No product categories match this filter.</p>}
        </Card>

        <Card title="Product details">
          <Badge tone={selectedOption.tone}>{selectedOption.status}</Badge>
          <h2 className="mt-3 text-xl font-semibold text-fg">{selectedOption.title}</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-fg">Eligibility</dt>
              <dd className="mt-1 leading-relaxed text-muted">{selectedOption.eligibility}</dd>
            </div>
            <div>
              <dt className="font-semibold text-fg">Risk note</dt>
              <dd className="mt-1 leading-relaxed text-muted">{selectedOption.risk}</dd>
            </div>
            <div>
              <dt className="font-semibold text-fg">Next step</dt>
              <dd className="mt-1 leading-relaxed text-muted">{selectedOption.nextStep}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card title="Live quote explorer" action={<Badge tone={isMarketOpen() ? "success" : "neutral"}>{isMarketOpen() ? "Session open" : "Session closed"}</Badge>}>
          {!prices ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-line/60" />)}
            </div>
          ) : prices.length === 0 ? (
            <div className="rounded-lg bg-bg p-5 text-center">
              <p className="font-medium text-fg">Waiting for market data</p>
              <p className="mt-1 text-sm text-muted">Live symbols will appear here when the configured feed sends a quote.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {prices.map((quote) => {
                const stale = quote.ageMs > 30000;
                return (
                  <button
                    key={quote.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(quote.symbol)}
                    className={`rounded-xl border p-4 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
                      selectedSymbol === quote.symbol ? "border-primary bg-primary-soft" : "border-line bg-bg"
                    }`}
                  >
                    <p className="font-mono text-sm font-semibold text-fg">{quote.symbol}</p>
                    <p className="mt-1 font-serif-display tabular-nums text-xl font-semibold text-fg">{formatMoney(quote.price)}</p>
                    <p className={`mt-2 text-xs ${stale ? "text-warning" : "text-muted"}`}>{stale ? "Quote may be stale" : `${Math.round(quote.ageMs / 1000)}s ago`}</p>
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
              <p className="mt-1 text-sm leading-relaxed text-muted">See price, movement, freshness, and market-session context before opening the supported trading workflow.</p>
            </div>
          </Card>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        This workspace is informational and does not provide investment advice, research, product approval, real-time market-data entitlement guarantees, or execution for products not explicitly supported by the Trader workflow.
      </p>
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
