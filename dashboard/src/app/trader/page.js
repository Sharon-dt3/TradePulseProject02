"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
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
import { useMarketPriceHistory } from "@/lib/useMarketPriceHistory";

const TABS = ["Orders", "Positions", "Trades", "Transactions"];
const POLL_INTERVAL_MS = 5000;

function TraderWorkspace() {
  const [account, setAccount] = useState(null);
  const [orders, setOrders] = useState(null);
  const [positions, setPositions] = useState(null);
  const [trades, setTrades] = useState(null);
  const [tab, setTab] = useState("Orders");
  const [error, setError] = useState(null);
  const { latest: marketPrices, history: marketHistory } = useMarketPriceHistory();

  const loadAccount = () => ledgerCoreFetch("/accounts/me").then(setAccount).catch((e) => setError(e.message));
  const loadOrders = () => ledgerCoreFetch("/orders").then(setOrders).catch((e) => setError(e.message));
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
      <PageHeader title="Trader" subtitle="Your account, orders, and live risk." />
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AccountSummaryCard
            account={account}
            positions={positions ?? []}
            prices={marketPrices ?? []}
            loading
          />
        </div>
        <RiskPanel />
      </div>

      <div className="mb-4">
        <Card title="Place order">
          <OrderForm onSubmit={handlePlaceOrder} prices={marketPrices} />
        </Card>
      </div>

      <Card>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === "Orders" && <OrdersTable orders={orders} loading={orders === null} onCancel={handleCancel} />}
        {tab === "Positions" && (
          <PositionsTable
            positions={positions}
            prices={marketPrices ?? []}
            loading={positions === null}
          />
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
