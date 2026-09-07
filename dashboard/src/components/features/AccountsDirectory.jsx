"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import FormField, { inputCls } from "@/components/ui/FormField";
import PositionsTable from "@/components/features/PositionsTable";
import TradesTable from "@/components/features/TradesTable";
import OrdersTable from "@/components/features/OrdersTable";
import GrantsPanel from "@/components/features/GrantsPanel";
import TabBar from "@/components/ui/TabBar";
import { formatMoney } from "@/lib/format";
import { ledgerCoreFetch } from "@/lib/api/client";

const DETAIL_TABS = ["Positions", "Trades", "Orders", "Grants & engagements"];

/**
 * The firm-wide account directory (GET /accounts, any-tier read via
 * account.read.any - Phase 20.0). Shared by Admin and Compliance, whose
 * permission sets differ: both hold accounts.freeze (V3 seed), so
 * `canFreeze` is true for both; only Admin holds account.grant.manage
 * (V28), so `canManageGrants` (grants + audit engagements tab) is
 * Admin-only.
 */
export default function AccountsDirectory({ canFreeze = false, canManageGrants = false }) {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(DETAIL_TABS[0]);
  const [positions, setPositions] = useState(null);
  const [trades, setTrades] = useState(null);
  const [orders, setOrders] = useState(null);

  const [freezeModal, setFreezeModal] = useState(null); // { account, action: "freeze"|"unfreeze" }
  const [freezeReason, setFreezeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => ledgerCoreFetch("/accounts").then(setAccounts).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const openDetail = (account) => {
    setSelected(account);
    setTab(DETAIL_TABS[0]);
    setPositions(null);
    setTrades(null);
    setOrders(null);
    ledgerCoreFetch(`/accounts/${account.accountId}/positions`).then(setPositions).catch(() => setPositions([]));
    ledgerCoreFetch(`/accounts/${account.accountId}/trades`).then(setTrades).catch(() => setTrades([]));
    ledgerCoreFetch(`/accounts/${account.accountId}/orders`).then(setOrders).catch(() => setOrders([]));
  };

  const submitFreeze = async (e) => {
    e.preventDefault();
    if (!freezeModal) return;
    setBusy(true);
    setError(null);
    try {
      await ledgerCoreFetch(`/accounts/${freezeModal.account.accountId}/${freezeModal.action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: freezeReason }),
      });
      setFreezeModal(null);
      setFreezeReason("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "ownerEmail", label: "Owner", sortable: true },
    { key: "accountId", label: "Account ID" },
    { key: "cashBalance", label: "Cash balance", render: (r) => formatMoney(r.cashBalance), sortable: true },
    { key: "marginEnabled", label: "Margin", render: (r) => (r.marginEnabled ? <Badge tone="info">enabled</Badge> : "—") },
    { key: "frozen", label: "Status", render: (r) => (r.frozen ? <Badge tone="danger">frozen</Badge> : <Badge tone="success">active</Badge>) },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openDetail(r)}>View</Button>
          {canFreeze && (
            <Button
              size="sm"
              variant={r.frozen ? "primary" : "danger"}
              onClick={() => setFreezeModal({ account: r, action: r.frozen ? "unfreeze" : "freeze" })}
            >
              {r.frozen ? "Unfreeze" : "Freeze"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      <Card title="Accounts">
        <DataTable columns={columns} rows={accounts} loading={accounts === null} rowKey="accountId" emptyMessage="No accounts found." />
      </Card>

      {selected && (
        <div className="mt-4">
          <Card
            title={`Account detail — ${selected.ownerEmail}`}
            action={
              <button className="text-sm text-muted hover:text-fg" onClick={() => setSelected(null)}>
                Close
              </button>
            }
          >
            <TabBar
              tabs={DETAIL_TABS.filter((t) => canManageGrants || t !== "Grants & engagements")}
              active={tab}
              onChange={setTab}
            />
            {tab === "Positions" && <PositionsTable positions={positions} loading={positions === null} />}
            {tab === "Trades" && <TradesTable trades={trades} loading={trades === null} />}
            {tab === "Orders" && <OrdersTable orders={orders} loading={orders === null} />}
            {tab === "Grants & engagements" && canManageGrants && <GrantsPanel accountId={selected.accountId} />}
          </Card>
        </div>
      )}

      <Modal
        open={!!freezeModal}
        title={freezeModal?.action === "freeze" ? "Freeze account" : "Unfreeze account"}
        onClose={() => setFreezeModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFreezeModal(null)}>Cancel</Button>
            <Button
              variant={freezeModal?.action === "freeze" ? "danger" : "primary"}
              loading={busy}
              disabled={!freezeReason.trim()}
              onClick={submitFreeze}
            >
              Confirm {freezeModal?.action}
            </Button>
          </>
        }
      >
        <form onSubmit={submitFreeze}>
          <FormField label="Reason" hint="Required — recorded in the audit log.">
            <input className={inputCls} value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} autoFocus />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
