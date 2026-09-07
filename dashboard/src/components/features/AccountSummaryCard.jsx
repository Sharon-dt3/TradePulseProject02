import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import { formatMoney, formatNumber } from "@/lib/format";

function valueForPosition(position, prices) {
  const quote = prices?.find((price) => price.symbol === position.symbol);
  return quote ? Number(position.quantity) * Number(quote.price) : 0;
}

/** Displays an account's current cash, available buying power, and priced holdings context. */
export default function AccountSummaryCard({ account, positions = [], prices = [], loading = false }) {
  if (!account) {
    if (!loading) return null;
    return (
      <Card title="Portfolio overview">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="h-3 w-20 animate-pulse rounded bg-line/60" />
              <div className="mt-2 h-7 w-28 animate-pulse rounded bg-line/60" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const cashBalance = Number(account.cashBalance ?? 0);
  const holdingsValue = positions.reduce((total, position) => total + valueForPosition(position, prices), 0);
  const pricedPositions = positions.filter((position) => prices?.some((price) => price.symbol === position.symbol)).length;
  const portfolioValue = cashBalance + holdingsValue;
  const negative = cashBalance < 0;

  return (
    <Card
      title="Portfolio overview"
      action={<Badge tone={account.frozen ? "danger" : "success"}>{account.frozen ? "Trading restricted" : "Account active"}</Badge>}
    >
      {account.frozen && <Alert tone="danger">This account is restricted. New orders will be rejected until the restriction is removed.</Alert>}
      {negative && !account.frozen && <Alert tone="warning">Cash is negative. Review buying power before submitting additional buy orders.</Alert>}

      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4">
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">Portfolio value</div>
          <div className="font-serif-display tabular-nums text-2xl font-semibold text-fg">{formatMoney(portfolioValue)}</div>
          <p className="mt-1 text-xs text-muted">Cash plus priced holdings</p>
        </div>
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">Cash available</div>
          <div className={`font-serif-display tabular-nums text-2xl font-semibold ${negative ? "text-danger" : "text-fg"}`}>{formatMoney(cashBalance)}</div>
          <p className="mt-1 text-xs text-muted">Before unsettled activity</p>
        </div>
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">Holdings value</div>
          <div className="font-serif-display tabular-nums text-2xl font-semibold text-fg">{formatMoney(holdingsValue)}</div>
          <p className="mt-1 text-xs text-muted">{formatNumber(pricedPositions, 0)} of {formatNumber(positions.length, 0)} positions priced</p>
        </div>
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">Trading profile</div>
          <div className="mt-1.5"><Badge tone={account.marginEnabled ? "info" : "neutral"}>{account.marginEnabled ? "Margin enabled" : "Cash account"}</Badge></div>
          <p className="mt-2 text-xs text-muted">Buying power equals available cash in this view.</p>
        </div>
      </div>
    </Card>
  );
}
