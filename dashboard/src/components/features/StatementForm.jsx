"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import { ledgerCoreFetch } from "@/lib/api/client";

export default function StatementForm({ accountId }) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGenerated(false);
    setSubmitting(true);
    try {
      await ledgerCoreFetch(`/accounts/${accountId}/statements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      setGenerated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Period start">
          <input className={inputCls} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
        </FormField>
        <FormField label="Period end">
          <input className={inputCls} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
        </FormField>
      </div>
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>
      {generated && (
        <Alert tone="success">
          Statement generated — a download/list view isn't available yet, this only confirms it was generated and stored.
        </Alert>
      )}
      <Button type="submit" variant="secondary" loading={submitting}>
        Generate statement
      </Button>
    </form>
  );
}
