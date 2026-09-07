"use client";

import { useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatNumber, formatMoney, formatDate, rejectionMessage, statusTone } from "@/lib/format";

const CANCELLABLE_STATUSES = new Set(["WORKING"]);
const ORDER_STATUSES = ["ALL", "WORKING", "FILLED", "REJECTED", "CANCELLED", "EXPIRED"];

/**
 * Renders searchable, status-filtered order activity. Cancellation is exposed
 * only for working orders and is delegated to the caller's authorized API flow.
 */
export default function OrdersTable({ orders, loading, onCancel, onTrade }) {
  const [cancellingId, setCancellingId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const handleCancel = async (orderId) => {
    setCancellingId(orderId);
    try {
      await onCancel(orderId);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();
    return (orders ?? []).filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      const matchesQuery = !normalizedQuery || order.symbol?.toUpperCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [orders, query, statusFilter]);

  const columns = [
    { key: "symbol", label: "Symbol", sortable: true },
    { key: "side", label: "Side", render: (row) => <Badge tone={row.side === "BUY" ? "success" : "danger"}>{row.side}</Badge> },
    { key: "orderType", label: "Type" },
    { key: "quantity", label: "Qty", render: (row) => formatNumber(row.quantity) },
    { key: "status", label: "Status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    {
      key: "rejectionReason",
      label: "Detail",
      render: (row) =>
        row.rejectionReason ? (
          <span className="text-xs text-danger">{rejectionMessage(row.rejectionReason)}</span>
        ) : row.fillPrice != null ? (
          <span className="text-xs text-muted">Filled at {formatMoney(row.fillPrice)}</span>
        ) : (
          "—"
        ),
    },
    { key: "executedAt", label: "Executed", render: (row) => formatDate(row.executedAt) },
  ];

  if (onCancel || onTrade) {
    columns.push({
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          {onTrade && (
            <Button type="button" size="sm" variant="secondary" onClick={() => onTrade(row.symbol)}>
              Trade
            </Button>
          )}
          {onCancel && CANCELLABLE_STATUSES.has(row.status) && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={cancellingId === row.orderId}
              onClick={() => handleCancel(row.orderId)}
            >
              Cancel
            </Button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="min-w-52 flex-1 text-sm text-muted">
          <span className="sr-only">Search orders</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders by symbol"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="text-sm text-muted">
          <span className="sr-only">Filter orders by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status === "ALL" ? "All statuses" : status}</option>)}
          </select>
        </label>
        <p className="text-xs text-muted">
          {loading ? "Loading orders…" : `${filteredOrders.length} of ${(orders ?? []).length} orders`}
        </p>
      </div>

      <DataTable
        loading={loading}
        rows={filteredOrders}
        rowKey="orderId"
        emptyMessage={query || statusFilter !== "ALL" ? "No orders match these filters." : "No orders yet."}
        columns={columns}
      />
    </div>
  );
}
