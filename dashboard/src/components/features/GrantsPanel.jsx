"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import FormField, { inputCls } from "@/components/ui/FormField";
import { formatDate } from "@/lib/format";
import { ledgerCoreFetch } from "@/lib/api/client";

const PURPOSES = ["viewer", "support"];

/**
 * Admin-only: list/issue/revoke account_grants for one account (Phase
 * 18 item 2 - Delegated Viewer/Support access), plus issuing an
 * audit_engagement for the same account (date-range access for the
 * Auditor role). Both are reason-mandatory, same philosophy as
 * freeze/unfreeze and ledger adjustments.
 */
export default function GrantsPanel({ accountId }) {
  const [grants, setGrants] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ grantedToUserId: "", purpose: "viewer", reason: "", expiresAt: "" });
  const [engForm, setEngForm] = useState({ auditorUserId: "", reason: "", scopeStartDate: "", scopeEndDate: "" });
  const [engMessage, setEngMessage] = useState(null);

  const load = () => {
    if (!accountId) return;
    ledgerCoreFetch(`/admin/accounts/${accountId}/grants`)
      .then(setGrants)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    setGrants(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const issueGrant = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await ledgerCoreFetch(`/admin/accounts/${accountId}/grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        }),
      });
      setForm({ grantedToUserId: "", purpose: "viewer", reason: "", expiresAt: "" });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (grantId) => {
    setBusy(true);
    setError(null);
    try {
      await ledgerCoreFetch(`/grants/${grantId}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const issueEngagement = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setEngMessage(null);
    try {
      await ledgerCoreFetch(`/admin/accounts/${accountId}/audit-engagements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(engForm),
      });
      setEngMessage("Audit engagement created.");
      setEngForm({ auditorUserId: "", reason: "", scopeStartDate: "", scopeEndDate: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "grantedToUserId", label: "Granted to" },
    { key: "purpose", label: "Purpose" },
    { key: "reason", label: "Reason" },
    { key: "expiresAt", label: "Expires", render: (r) => formatDate(r.expiresAt) },
    { key: "createdAt", label: "Created", render: (r) => formatDate(r.createdAt) },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button size="sm" variant="danger" disabled={busy} onClick={() => revoke(r.id)}>
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      <Card title="Access grants">
        <DataTable columns={columns} rows={grants} loading={grants === null} rowKey="id" emptyMessage="No grants issued for this account." />
        <form onSubmit={issueGrant} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <FormField label="Grant to (user ID)">
            <input className={inputCls} value={form.grantedToUserId} onChange={(e) => setForm({ ...form, grantedToUserId: e.target.value })} required />
          </FormField>
          <FormField label="Purpose">
            <select className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Expires at">
            <input type="datetime-local" className={inputCls} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} required />
          </FormField>
          <FormField label="Reason">
            <input className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </FormField>
          <div className="md:col-span-4">
            <Button type="submit" loading={busy}>Issue grant</Button>
          </div>
        </form>
      </Card>

      <Card title="Audit engagement (Auditor date-range access)">
        <Alert tone="success" onDismiss={() => setEngMessage(null)}>{engMessage}</Alert>
        <form onSubmit={issueEngagement} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FormField label="Auditor (user ID)">
            <input className={inputCls} value={engForm.auditorUserId} onChange={(e) => setEngForm({ ...engForm, auditorUserId: e.target.value })} required />
          </FormField>
          <FormField label="Scope start">
            <input type="date" className={inputCls} value={engForm.scopeStartDate} onChange={(e) => setEngForm({ ...engForm, scopeStartDate: e.target.value })} required />
          </FormField>
          <FormField label="Scope end">
            <input type="date" className={inputCls} value={engForm.scopeEndDate} onChange={(e) => setEngForm({ ...engForm, scopeEndDate: e.target.value })} required />
          </FormField>
          <FormField label="Reason">
            <input className={inputCls} value={engForm.reason} onChange={(e) => setEngForm({ ...engForm, reason: e.target.value })} required />
          </FormField>
          <div className="md:col-span-4">
            <Button type="submit" loading={busy}>Create engagement</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
