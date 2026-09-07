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
import StatementForm from "@/components/features/StatementForm";
import RiskPanel from "@/components/features/RiskPanel";
import { ledgerCoreFetch } from "@/lib/api/client";

const TABS = ["Orders", "Positions", "Trades", "Transactions"];
const POLL_INTERVAL_MS = 5000;

function TraderWorkspace() {
  const [account, setAccount] = useState(null);
  const [orders, setOrders] = useState(null);
  const [positions, setPositions] = useState(null);
  const [trades, setTrades] = useState(null);
  const [tab, setTab] = useState("Orders");
  const [error, setError] = useState(null);

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
          <AccountSummaryCard account={account} />
        </div>
        <RiskPanel />
      </div>

      <div className="mb-4">
        <Card title="Place order">
          <OrderForm onSubmit={handlePlaceOrder} />
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium ${
                tab === t ? "border-b-2 border-primary text-primary" : "text-muted hover:text-fg"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "Orders" && <OrdersTable orders={orders} loading={orders === null} onCancel={handleCancel} />}
        {tab === "Positions" && <PositionsTable positions={positions} loading={positions === null} />}
        {tab === "Trades" && <TradesTable trades={trades} loading={trades === null} />}
        {tab === "Transactions" && <TransactionsTable />}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Generate statement">
          {account && <StatementForm accountId={account.accountId} />}
        </Card>
        <MarketPricesTable />
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
