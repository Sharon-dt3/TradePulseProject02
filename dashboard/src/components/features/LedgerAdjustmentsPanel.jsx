"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import { formatMoney, formatDate, statusTone } from "@/lib/format";
import { ledgerCoreFetch } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Admin's dual-control ledger adjustment workflow: propose (any admin,
 * any account) then approve by a *different* admin (DB-enforced
 * CHECK(proposed_by <> approved_by), echoed here so a self-approval
 * attempt never even reaches the API). There's no GET /ledger/adjustments
 * list endpoint, so this stays a propose/approve-by-id form rather than
 * a table - the resulting adjustment is shown inline after each action.
 */
export default function LedgerAdjustmentsPanel() {
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const [proposeForm, setProposeForm] = useState({ accountId: "", amount: "", reason: "" });
  const [approveId, setApproveId] = useState("");

  const propose = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await ledgerCoreFetch("/ledger/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposeForm),
      });
      setLastResult(result);
      setProposeForm({ accountId: "", amount: "", reason: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await ledgerCoreFetch(`/ledger/adjustments/${approveId}/approve`, { method: "POST" });
      setLastResult(result);
      setApproveId("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="space-y-4">
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      {lastResult && (
        <Alert tone="success">
          Adjustment {lastResult.id}: {formatMoney(lastResult.amount)} on account {lastResult.accountId} —{" "}
          <Badge tone={statusTone(lastResult.status)}>{lastResult.status}</Badge>{" "}
          (proposed {formatDate(lastResult.proposedAt)}
          {lastResult.approvedAt ? `, approved ${formatDate(lastResult.approvedAt)}` : ""})
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Propose adjustment">
          <form onSubmit={propose} className="space-y-3">
            <FormField label="Account ID">
              <input className={inputCls} value={proposeForm.accountId} onChange={(e) => setProposeForm({ ...proposeForm, accountId: e.target.value })} required />
            </FormField>
            <FormField label="Amount" hint="Positive to credit, negative to debit.">
              <input type="number" step="0.01" className={inputCls} value={proposeForm.amount} onChange={(e) => setProposeForm({ ...proposeForm, amount: e.target.value })} required />
            </FormField>
            <FormField label="Reason">
              <input className={inputCls} value={proposeForm.reason} onChange={(e) => setProposeForm({ ...proposeForm, reason: e.target.value })} required />
            </FormField>
            <Button type="submit" loading={busy}>Propose</Button>
          </form>
        </Card>

        <Card title="Approve adjustment">
          <Alert tone="info">A different admin must approve — the proposer can't approve their own adjustment.</Alert>
          <form onSubmit={approve} className="mt-3 space-y-3">
            <FormField label="Adjustment ID">
              <input className={inputCls} value={approveId} onChange={(e) => setApproveId(e.target.value)} required />
            </FormField>
            <Button type="submit" loading={busy}>Approve</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
