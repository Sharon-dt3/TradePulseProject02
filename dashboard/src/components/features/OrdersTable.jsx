"use client";

import { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatNumber, formatMoney, formatDate, rejectionMessage, statusTone } from "@/lib/format";

const CANCELLABLE_STATUSES = new Set(["WORKING"]); // OrderServiceImpl.cancelOrder only allows WORKING (Order.Status has no "PENDING")

/** onCancel is optional - only Trader's own-order view passes it. */
export default function OrdersTable({ orders, loading, onCancel }) {
  const [cancellingId, setCancellingId] = useState(null);

  const handleCancel = async (orderId) => {
    setCancellingId(orderId);
    try {
      await onCancel(orderId);
    } finally {
      setCancellingId(null);
    }
  };

  const columns = [
    { key: "symbol", label: "Symbol", sortable: true },
    { key: "side", label: "Side", render: (r) => <Badge tone={r.side === "BUY" ? "success" : "danger"}>{r.side}</Badge> },
    { key: "orderType", label: "Type" },
    { key: "quantity", label: "Qty", render: (r) => formatNumber(r.quantity) },
    { key: "status", label: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    {
      key: "rejectionReason",
      label: "Detail",
      render: (r) =>
        r.rejectionReason ? (
          <span className="text-xs text-danger">{rejectionMessage(r.rejectionReason)}</span>
        ) : r.fillPrice != null ? (
          <span className="text-xs text-muted">Filled at {formatMoney(r.fillPrice)}</span>
        ) : (
          "—"
        ),
    },
    { key: "executedAt", label: "Executed", render: (r) => formatDate(r.executedAt) },
  ];

  if (onCancel) {
    columns.push({
      key: "actions",
      label: "",
      render: (r) =>
        CANCELLABLE_STATUSES.has(r.status) ? (
          <Button
            size="sm"
            variant="secondary"
            loading={cancellingId === r.orderId}
            onClick={() => handleCancel(r.orderId)}
          >
            Cancel
          </Button>
        ) : null,
    });
  }

  return (
    <DataTable loading={loading} rows={orders} rowKey="orderId" emptyMessage="No orders yet." columns={columns} />
  );
}
