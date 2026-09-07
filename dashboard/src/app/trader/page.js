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
import PortfolioCommandCenter from "@/components/features/PortfolioCommandCenter";
import TabBar from "@/components/ui/TabBar";
import { ledgerCoreFetch } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import MarketPulse from "@/components/features/MarketPulse";
import { useDemoEquityPrices } from "@/lib/useDemoEquityPrices";
import { useMarketPriceHistory } from "@/lib/useMarketPriceHistory";

const TABS = ["Orders", "Positions", "Trades", "Transactions"];
const POLL_INTERVAL_MS = 5000;

function TodaySummary({ account, orders, positions, prices, onReviewOpenOrders, onSelectTab }) {
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
    { label: "Open orders", value: openOrders.toLocaleString(), detail: openOrders ? "Review active instructions" : "No active instructions", action: onReviewOpenOrders },
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
  const [showWorkingOrders, setShowWorkingOrders] = useState(false);
  const [orderSymbol, setOrderSymbol] = useState("");
  const [error, setError] = useState(null);
  const { latest: marketPrices, history: marketHistory } = useMarketPriceHistory();
  const {
    enabled: demoEquitiesEnabled,
    latest: demoEquityPrices,
    history: demoEquityHistory,
  } = useDemoEquityPrices();
  const marketMonitorPrices = [
    ...(marketPrices ?? []).filter((quote) => !demoEquityPrices.some((demoQuote) => demoQuote.symbol === quote.symbol)),
    ...demoEquityPrices,
  ];
  const marketMonitorHistory = { ...marketHistory, ...demoEquityHistory };

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

  const handleReviewOpenOrders = () => {
    setShowWorkingOrders(true);
    setTab("Orders");
    requestAnimationFrame(() => {
      document.getElementById("activity-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSelectTab = (nextTab) => {
    setShowWorkingOrders(false);
    setTab(nextTab);
  };

  const handleReviewPositions = () => {
    setShowWorkingOrders(false);
    setTab("Positions");
    requestAnimationFrame(() => {
      document.getElementById("activity-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleTradeSymbol = (symbol) => {
    setOrderSymbol(symbol);
    requestAnimationFrame(() => {
      document.getElementById("place-order")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePositionDetails = (symbol) => {
    setOrderSymbol(symbol);
    setTab("Positions");
    requestAnimationFrame(() => {
      document.getElementById("activity-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const displayedOrders =
    showWorkingOrders && orders ? orders.filter((order) => order.status === "WORKING") : orders;

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
        onReviewOpenOrders={handleReviewOpenOrders}
        onSelectTab={handleSelectTab}
      />

      <div className="mb-4">
        <PortfolioCommandCenter
          account={account}
          positions={positions ?? []}
          prices={marketMonitorPrices}
          history={marketMonitorHistory}
          orders={orders ?? []}
          trades={trades ?? []}
          onTrade={handleTradeSymbol}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <AccountSummaryCard account={account} positions={positions ?? []} prices={marketPrices ?? []} loading />
        </div>
        <RiskPanel />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Quick actions" className="xl:col-span-1">
          <div className="grid gap-2.5">
            <a
              href="#place-order"
              className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#4f46e5] to-[#635bdf] px-3.5 py-3.5 text-primary-fg shadow-[0_8px_18px_rgba(79,70,229,0.2)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,229,0.28)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/18 text-lg font-semibold">↗</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Place an order</span>
                <span className="mt-0.5 block text-xs text-white/75">Buy or sell a supported symbol</span>
              </span>
              <span className="text-lg text-white/80 transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <button
              type="button"
              onClick={handleReviewOpenOrders}
              className="group flex w-full items-center gap-3 rounded-xl border border-[#f0d7a7] bg-gradient-to-r from-[#fffaf0] to-[#fff5e1] px-3.5 py-3.5 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[#e5bb6d] hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff0cf] text-lg font-semibold text-[#9a5a12]">◷</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#70400c]">Review open orders</span>
                <span className="mt-0.5 block text-xs text-[#9a6c31]">Focus on active instructions</span>
              </span>
              <span className="text-lg text-[#b67a25] transition-transform group-hover:translate-x-0.5">→</span>
            </button>
            <button
              type="button"
              onClick={handleReviewPositions}
              className="group flex w-full items-center gap-3 rounded-xl border border-[#c9e6dc] bg-gradient-to-r from-[#f0fbf7] to-[#e6f8f2] px-3.5 py-3.5 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[#83c7ae] hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d8f3e9] text-lg font-semibold text-[#18794e]">▣</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#155d3e]">View holdings</span>
                <span className="mt-0.5 block text-xs text-[#347a60]">Inspect your current positions</span>
              </span>
              <span className="text-lg text-[#27805d] transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </Card>
        <Card
          title="Market pulse"
          action={<span className="text-xs text-muted">interactive quote workspace</span>}
          className="xl:col-span-2"
        >
          <MarketPulse
            prices={marketMonitorPrices}
            history={marketMonitorHistory}
            demoEquitiesEnabled={demoEquitiesEnabled}
            onTrade={handleTradeSymbol}
          />
        </Card>
      </div>

      <div id="place-order" className="mb-4 scroll-mt-4">
        <Card title="Place order">
          <OrderForm
            onSubmit={handlePlaceOrder}
            prices={marketPrices}
            positions={positions}
            initialSymbol={orderSymbol}
          />
        </Card>
      </div>

      <div id="activity-workspace" className="scroll-mt-6">
        <Card>
          <TabBar tabs={TABS} active={tab} onChange={handleSelectTab} />
          {tab === "Orders" && (
            <OrdersTable
              orders={displayedOrders}
              loading={orders === null}
              onCancel={handleCancel}
            />
          )}
          {tab === "Positions" && (
            <PositionsTable
              positions={positions}
              prices={marketMonitorPrices}
              loading={positions === null}
              onSelectPosition={handlePositionDetails}
              onTrade={handleTradeSymbol}
            />
          )}
          {tab === "Trades" && <TradesTable trades={trades} loading={trades === null} />}
          {tab === "Transactions" && <TransactionsTable />}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Generate statement">
          {account && <StatementForm accountId={account.accountId} />}
        </Card>
        <MarketPricesTable prices={marketPrices} />
      </div>

      <div className="mt-4">
        <MarketPriceSparklines latest={marketMonitorPrices} history={marketMonitorHistory} />
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
