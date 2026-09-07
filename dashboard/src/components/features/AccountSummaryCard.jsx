import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import { formatMoney } from "@/lib/format";

/** Reused by Trader, Viewer, and (inside AccountsDirectory) Admin/Compliance. */
export default function AccountSummaryCard({ account, loading = false }) {
  if (!account) {
    if (!loading) return null;
    return (
      <Card title="Account">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-20 animate-pulse rounded bg-line/60" />
              <div className="mt-2 h-6 w-24 animate-pulse rounded bg-line/60" />
            </div>
          ))}
        </div>
      </Card>
    );
  }
  const negative = Number(account.cashBalance) < 0;
  return (
    <Card title="Account">
      {account.frozen && (
        <div className="mb-3">
          <Alert tone="danger">
            This account is frozen. New orders will be rejected until it's unfrozen.
          </Alert>
        </div>
      )}
      {negative && !account.frozen && (
        <div className="mb-3">
          <Alert tone="warning">
            Cash balance is negative. This account owes more than it holds in cash — new
            buys that further increase exposure may be rejected by the notional limit.
          </Alert>
        </div>
      )}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
            Cash balance
          </div>
          <div
            className={`font-serif-display tabular-nums text-2xl font-semibold ${
              negative ? "text-danger" : "text-fg"
            }`}
          >
            {formatMoney(account.cashBalance)}
          </div>
        </div>
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
            Margin
          </div>
          <div className="mt-1.5">
            <Badge tone={account.marginEnabled ? "info" : "neutral"}>
              {account.marginEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
            Status
          </div>
          <div className="mt-1.5">
            <Badge tone={account.frozen ? "danger" : "success"}>
              {account.frozen ? "Frozen" : "Active"}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
