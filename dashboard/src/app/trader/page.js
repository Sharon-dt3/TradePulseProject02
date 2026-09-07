"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import AccountSummaryCard from "@/components/features/AccountSummaryCard";
import OrdersTable from "@/components/features/OrdersTable";
import OrderForm from "@/components/features/OrderForm";
import PositionsTable from "@/components/features/PositionsTable";
import TradesTable from "@/components/features/TradesTable";
import TransactionsTable from "@/components/features/TransactionsTable";
import MarketPricesTable from "@/components/features/MarketPricesTable";
import MarketPriceSparklines from "@/components/features/MarketPriceSparklines";
import StatementForm from "@/components/features/StatementForm";
import RiskPanel from "@/components/features/RiskPanel";
import TabBar from "@/components/ui/TabBar";
import { ledgerCoreFetch } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import { useMarketPriceHistory } from "@/lib/useMarketPriceHistory";

const TABS = ["Orders", "Positions", "Trades", "Transactions"];
const POLL_INTERVAL_MS = 5000;

function TodaySummary({ account, orders, positions, prices, onSelectTab }) {
  if (!account || orders === null) {
    return (
      <section aria-label="Today's account summary" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-line bg-surface p-4">
            <div className="h-3 w-20 rounded bg-line" />
            <div className="mt-4 h-7 w-28 rounded bg-line" />
          </div>
        ))}
      </section>
    );
  }

  const cash = Number(account.cashBalance ?? 0);
  const holdingsValue = (positions ?? []).reduce((total, position) => {
    const quote = prices?.find((price) => price.symbol === position.symbol);
    return total + (quote ? Number(position.quantity) * Number(quote.price) : 0);
  }, 0);
  const openOrders = orders.filter((order) => order.status === "WORKING").length;
  const quotedSymbols = prices?.length ?? 0;

  const items = [
    { label: "Portfolio value", value: formatMoney(cash + holdingsValue), detail: "Cash + quoted holdings" },
    { label: "Cash available", value: formatMoney(cash), detail: cash < 0 ? "Review buying power" : "Ready for supported orders", tone: cash < 0 ? "danger" : undefined },
    { label: "Open orders", value: openOrders.toLocaleString(), detail: openOrders ? "Review active instructions" : "No active instructions", action: () => onSelectTab("Orders") },
    { label: "Live quotes", value: quotedSymbols.toLocaleString(), detail: quotedSymbols ? "Symbols available to explore" : "Waiting for market data", action: undefined },
  ];

  return (
    <section aria-label="Today's account summary" className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted">Today</h2>
        <Badge tone="info">Live workspace</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            disabled={!item.action}
            className={`group rounded-xl border border-line bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-200 ${
              item.action ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]" : "cursor-default"
            }`}
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">{item.label}</p>
            <p className={`mt-2 font-serif-display tabular-nums text-2xl font-semibold ${item.tone === "danger" ? "text-danger" : "text-fg"}`}>
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted">{item.detail}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function TraderWorkspace() {
  const [account, setAccount] = useState(null);
  const [orders, setOrders] = useState(null);
  const [positions, setPositions] = useState(null);
  const [trades, setTrades] = useState(null);
  const [tab, setTab] = useState("Orders");
  const [error, setError] = useState(null);
  const { latest: marketPrices, history: marketHistory } = useMarketPriceHistory();

  const loadAccount = () => ledgerCoreFetch("/accounts/me").then(setAccount).catch((error) => setError(error.message));
  const loadOrders = () => ledgerCoreFetch("/orders").then(setOrders).catch((error) => setError(error.message));
  const loadPositions = () => ledgerCoreFetch("/positions").then(setPositions).catch(() => {});
  const loadTrades = () => ledgerCoreFetch("/trades").then(setTrades).catch(() => {});

  useEffect(() => {
    loadAccount();
    loadOrders();
    loadPositions();
    loadTrades();
    const id = setInterval(() => {
      loadAccount();
      loadOrders();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  const handlePlaceOrder = async (body) => {
    const result = await ledgerCoreFetch("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await Promise.all([loadOrders(), loadPositions(), loadAccount()]);
    return result;
  };

  const handleCancel = async (orderId) => {
    await ledgerCoreFetch(`/orders/${orderId}/cancel`, { method: "POST" });
    await loadOrders();
  };

  return (
    <div>
      <PageHeader
        title="Trader"
        subtitle="A live view of your account, supported orders, and market context."
        action={
          <Link href="/markets" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-primary-soft">
            Explore markets
          </Link>
        }
      />
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      <TodaySummary
        account={account}
        orders={orders}
        positions={positions}
        prices={marketPrices}
        onSelectTab={setTab}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AccountSummaryCard account={account} positions={positions ?? []} prices={marketPrices ?? []} loading />
        </div>
        <RiskPanel />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Quick actions" className="xl:col-span-1">
          <div className="space-y-2">
            <a href="#place-order" className="block rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90">
              Buy or sell a supported symbol
            </a>
            <button type="button" onClick={() => setTab("Orders")} className="block w-full rounded-lg border border-line px-4 py-3 text-left text-sm font-medium text-fg transition-colors hover:bg-primary-soft">
              Review open orders
            </button>
            <button type="button" onClick={() => setTab("Positions")} className="block w-full rounded-lg border border-line px-4 py-3 text-left text-sm font-medium text-fg transition-colors hover:bg-primary-soft">
              View holdings
            </button>
          </div>
        </Card>
        <Card title="Market pulse" className="xl:col-span-2">
          {!marketPrices ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-line/60" />)}
            </div>
          ) : marketPrices.length === 0 ? (
            <p className="text-sm text-muted">No quotes are available yet. Market cards will appear when the configured feed sends data.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {marketPrices.slice(0, 6).map((quote) => (
                <Link key={quote.symbol} href="/markets" className="rounded-lg border border-line bg-bg p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
                  <p className="font-mono text-sm font-semibold text-fg">{quote.symbol}</p>
                  <p className="mt-1 font-serif-display tabular-nums text-lg font-semibold text-fg">{formatMoney(quote.price)}</p>
                  <p className={`mt-1 text-xs ${quote.ageMs > 30000 ? "text-warning" : "text-muted"}`}>
                    {quote.ageMs > 30000 ? "Quote may be stale" : `${Math.round(quote.ageMs / 1000)}s ago`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div id="place-order" className="mb-4 scroll-mt-4">
        <Card title="Place order">
          <OrderForm onSubmit={handlePlaceOrder} prices={marketPrices} />
        </Card>
      </div>

      <Card>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === "Orders" && <OrdersTable orders={orders} loading={orders === null} onCancel={handleCancel} />}
        {tab === "Positions" && (
          <PositionsTable positions={positions} prices={marketPrices ?? []} loading={positions === null} />
        )}
        {tab === "Trades" && <TradesTable trades={trades} loading={trades === null} />}
        {tab === "Transactions" && <TransactionsTable />}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Generate statement">
          {account && <StatementForm accountId={account.accountId} />}
        </Card>
        <MarketPricesTable prices={marketPrices} />
      </div>

      <div className="mt-4">
        <MarketPriceSparklines latest={marketPrices} history={marketHistory} />
      </div>
    </div>
  );
}

export default function TraderPage() {
  return (
    <RequireRole roles={["trader"]}>
      <TraderWorkspace />
    </RequireRole>
  );
}
