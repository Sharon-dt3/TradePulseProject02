const TONES = {
  danger: "bg-danger-bg text-danger border-danger/25",
  warning: "bg-warning-bg text-warning border-warning/25",
  success: "bg-success-bg text-success border-success/25",
  info: "bg-info-bg text-info border-info/25",
};

export default function Alert({ tone = "danger", children, onDismiss }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed ${TONES[tone]}`}
    >
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          &times;
        </button>
      )}
    </div>
  );
}
