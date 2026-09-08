import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatMoney, formatDate } from "@/lib/format";

export default function TradesTable({ trades, loading }) {
  return (
    <DataTable
      loading={loading}
      rows={trades}
      rowKey="tradeId"
      emptyMessage="No trades yet."
      columns={[
        { key: "executedAt", label: "Executed", sortable: true, render: (r) => formatDate(r.executedAt) },
        { key: "symbol", label: "Symbol", sortable: true },
        {
          key: "side",
          label: "Side",
          render: (r) => (
            <Badge tone={r.side === "BUY" ? "success" : "danger"} size="prominent" interactive>
              {r.side}
            </Badge>
          ),
        },
        { key: "quantity", label: "Qty", render: (r) => formatNumber(r.quantity) },
        { key: "price", label: "Price", render: (r) => formatMoney(r.price) },
      ]}
    />
  );
}
