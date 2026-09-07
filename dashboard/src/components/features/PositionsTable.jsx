import DataTable from "@/components/ui/DataTable";
import { formatNumber } from "@/lib/format";

export default function PositionsTable({ positions, loading }) {
  return (
    <DataTable
      loading={loading}
      rows={positions}
      rowKey="symbol"
      emptyMessage="No open positions."
      columns={[
        { key: "symbol", label: "Symbol", sortable: true },
        { key: "quantity", label: "Net quantity", sortable: true, render: (r) => formatNumber(r.quantity) },
      ]}
    />
  );
}
