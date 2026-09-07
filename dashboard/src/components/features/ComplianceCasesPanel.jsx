"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import FormField, { inputCls } from "@/components/ui/FormField";
import { formatDate, statusTone } from "@/lib/format";
import { ledgerCoreFetch } from "@/lib/api/client";

/**
 * Compliance case workflow: open a case for an account (reason
 * mandatory), close a case, list cases for an account. There's no
 * "list all cases" endpoint (GET /compliance/cases requires
 * ?accountId=...), so this is account-scoped by design, same
 * search-by-account shape as GrantsPanel.
 */
export default function ComplianceCasesPanel() {
  const [accountId, setAccountId] = useState("");
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openReason, setOpenReason] = useState("");

  const load = (id) => {
    if (!id) return;
    ledgerCoreFetch(`/compliance/cases?accountId=${id}`)
      .then(setCases)
      .catch((e) => setError(e.message));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!accountId.trim()) return;
    setCases(null);
    load(accountId.trim());
  };

  const openCase = async (e) => {
    e.preventDefault();
    if (!accountId.trim() || !openReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await ledgerCoreFetch("/compliance/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accountId.trim(), reason: openReason.trim() }),
      });
      setOpenReason("");
      load(accountId.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const closeCase = async (caseId) => {
    setBusy(true);
    setError(null);
    try {
      await ledgerCoreFetch(`/compliance/cases/${caseId}/close`, { method: "POST" });
      load(accountId.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "id", label: "Case ID" },
    { key: "status", label: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { key: "reason", label: "Reason" },
    { key: "openedAt", label: "Opened", render: (r) => formatDate(r.openedAt) },
    { key: "closedAt", label: "Closed", render: (r) => formatDate(r.closedAt) },
    {
      key: "actions",
      label: "",
      render: (r) =>
        r.status === "OPEN" ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => closeCase(r.id)}>
            Close case
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      <Card title="Compliance cases">
        <form onSubmit={handleSearch} className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            <FormField label="Account ID">
              <input className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
            </FormField>
          </div>
          <Button type="submit">Look up</Button>
        </form>

        {accountId && (
          <>
            <DataTable columns={columns} rows={cases} loading={cases === null} rowKey="id" emptyMessage="No cases for this account." />

            <form onSubmit={openCase} className="mt-4 flex items-end gap-2">
              <div className="flex-1">
                <FormField label="Open a new case" hint="Reason is required — recorded on the case.">
                  <input className={inputCls} value={openReason} onChange={(e) => setOpenReason(e.target.value)} />
                </FormField>
              </div>
              <Button type="submit" loading={busy} disabled={!openReason.trim()}>Open case</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
