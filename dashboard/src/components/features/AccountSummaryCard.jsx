import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import { formatMoney } from "@/lib/format";

/** Reused by Trader, Viewer, and (inside AccountsDirectory) Admin/Compliance. */
export default function AccountSummaryCard({ account }) {
  if (!account) return null;
  return (
    <Card title="Account">
      {account.frozen && (
        <div className="mb-3">
          <Alert tone="danger">
            This account is frozen. New orders will be rejected until it's unfrozen.
          </Alert>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs text-muted">Cash balance</div>
          <div className="text-lg font-semibold text-fg">{formatMoney(account.cashBalance)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Margin</div>
          <div className="mt-0.5">
            <Badge tone={account.marginEnabled ? "info" : "neutral"}>
              {account.marginEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">Status</div>
          <div className="mt-0.5">
            <Badge tone={account.frozen ? "danger" : "success"}>
              {account.frozen ? "Frozen" : "Active"}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
