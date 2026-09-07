"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import { ledgerCoreDownload } from "@/lib/api/client";

export default function StatementForm({ accountId }) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setGenerated(null);

    if (periodEnd < periodStart) {
      setError("Period end must be on or after period start.");
      return;
    }

    setSubmitting(true);
    try {
      const statement = await ledgerCoreDownload(`/accounts/${accountId}/statements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      const downloadUrl = URL.createObjectURL(statement);
      const downloadLink = document.createElement("a");

      downloadLink.href = downloadUrl;
      downloadLink.download = `tradepulse-statement-${periodStart}-to-${periodEnd}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);

      setGenerated(`Statement for ${periodStart} through ${periodEnd} was generated and downloaded.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Period start">
          <input
            className={inputCls}
            type="date"
            value={periodStart}
            max={periodEnd || undefined}
            onChange={(event) => setPeriodStart(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Period end">
          <input
            className={inputCls}
            type="date"
            value={periodEnd}
            min={periodStart || undefined}
            onChange={(event) => setPeriodEnd(event.target.value)}
            required
          />
        </FormField>
      </div>
      <Alert tone="danger" onDismiss={() => setError(null)}>
        {error}
      </Alert>
      {generated && <Alert tone="success">{generated}</Alert>}
      <Button type="submit" variant="secondary" loading={submitting}>
        Generate statement
      </Button>
    </form>
  );
}
