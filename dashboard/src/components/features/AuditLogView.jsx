"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import DataTable from "@/components/ui/DataTable";
import FormField, { inputCls } from "@/components/ui/FormField";
import { formatDate } from "@/lib/format";
import { ledgerCoreFetch } from "@/lib/api/client";

/**
 * Generic audit-log view shared by Admin (/admin/audit-log) and
 * Compliance (/compliance/audit-log) - same 200-row read, same
 * optional entityType filter, different URL only (see
 * AdminAuditLogController / ComplianceAuditLogController, both
 * routing to the same AuditReadService). entityType values in the
 * live table are a real mix of casing - "account", "order", "trade",
 * "compliance_case", "storage_object" (lowercase) vs
 * "LEDGER_ADJUSTMENT" (upper-snake) - so the filter is a free-text
 * exact match, not a dropdown of guessed values.
 */
export default function AuditLogView({ endpoint }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [entityType, setEntityType] = useState("");

  const load = () => {
    const qs = entityType.trim() ? `?entityType=${encodeURIComponent(entityType.trim())}` : "";
    ledgerCoreFetch(`${endpoint}${qs}`)
      .then(setEntries)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    setEntries(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const columns = [
    { key: "createdAt", label: "When", render: (r) => formatDate(r.createdAt), sortable: true },
    { key: "actorUserId", label: "Actor" },
    { key: "action", label: "Action" },
    { key: "entityType", label: "Entity type" },
    { key: "entityId", label: "Entity ID" },
    {
      key: "details",
      label: "Details",
      render: (r) => (
        <span className="block max-w-xs truncate text-xs text-muted" title={JSON.stringify(r.details)}>
          {JSON.stringify(r.details)}
        </span>
      ),
    },
  ];

  return (
    <Card title="Audit log">
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setEntries(null);
          load();
        }}
        className="mb-3 flex items-end gap-2"
      >
        <div className="w-64">
          <FormField label="Filter by entity type" hint='exact match, e.g. "account" or "LEDGER_ADJUSTMENT"'>
            <input className={inputCls} value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="(all)" />
          </FormField>
        </div>
        <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-line/40">
          Apply
        </button>
      </form>
      <DataTable columns={columns} rows={entries} loading={entries === null} rowKey="id" emptyMessage="No audit entries found." />
    </Card>
  );
}
