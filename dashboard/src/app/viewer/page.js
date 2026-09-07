"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import FormField, { inputCls } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import AccountSummaryCard from "@/components/features/AccountSummaryCard";
import PositionsTable from "@/components/features/PositionsTable";
import TradesTable from "@/components/features/TradesTable";
import OrdersTable from "@/components/features/OrdersTable";
import { ledgerCoreFetch } from "@/lib/api/client";

const TABS = ["Orders", "Positions", "Trades"];

function ViewerWorkspace() {
  const [accountId, setAccountId] = useState("");
  const [pendingAccountId, setPendingAccountId] = useState("");
  const [account, setAccount] = useState(null);
  const [orders, setOrders] = useState(null);
  const [positions, setPositions] = useState(null);
  const [trades, setTrades] = useState(null);
  const [tab, setTab] = useState("Orders");
  const [error, setError] = useState(null);

  const loadAll = (id) => {
    if (!id) return;
    setError(null);
    ledgerCoreFetch(`/accounts/${id}`)
      .then(setAccount)
      .catch((e) => setError(e.message));
    ledgerCoreFetch(`/accounts/${id}/orders`)
      .then(setOrders)
      .catch(() => setOrders([]));
    ledgerCoreFetch(`/accounts/${id}/positions`)
      .then(setPositions)
      .catch(() => setPositions([]));
    ledgerCoreFetch(`/accounts/${id}/trades`)
      .then(setTrades)
      .catch(() => setTrades([]));
  };

  useEffect(() => {
    // Viewer has no self-service list of which accounts it's been granted
    // access to (no such endpoint exists yet) — the user has to know and
    // enter the account id themselves. See ImplementationPlan.md 20.2.
  }, []);

  const handleSwitch = (e) => {
    e.preventDefault();
    if (!pendingAccountId.trim()) return;
    setAccountId(pendingAccountId.trim());
    loadAll(pendingAccountId.trim());
  };

  return (
    <div>
      <PageHeader title="Viewer" subtitle="Read-only access to accounts granted to you." />
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      <div className="mb-4">
        <Card title="Open an account">
          <Alert tone="info">
            There is no self-service list of accounts you've been granted access to yet —
            enter the account ID you were given (by an Admin or the account owner) below.
          </Alert>
          <form onSubmit={handleSwitch} className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <FormField label="Account ID">
                <input
                  className={inputCls}
                  value={pendingAccountId}
                  onChange={(e) => setPendingAccountId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </FormField>
            </div>
            <Button type="submit">Open</Button>
          </form>
        </Card>
      </div>

      {accountId && (
        <>
          <div className="mb-4">
            <AccountSummaryCard account={account} />
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
            {tab === "Orders" && <OrdersTable orders={orders} loading={orders === null} />}
            {tab === "Positions" && <PositionsTable positions={positions} loading={positions === null} />}
            {tab === "Trades" && <TradesTable trades={trades} loading={trades === null} />}
          </Card>
        </>
      )}
    </div>
  );
}

export default function ViewerPage() {
  return (
    <RequireRole roles={["viewer", "delegated_viewer"]}>
      <ViewerWorkspace />
    </RequireRole>
  );
}
