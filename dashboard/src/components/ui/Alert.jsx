const TONES = {
  danger: "bg-danger-bg text-danger border-danger/30",
  warning: "bg-warning-bg text-warning border-warning/30",
  success: "bg-success-bg text-success border-success/30",
  info: "bg-info-bg text-info border-info/30",
};

export default function Alert({ tone = "danger", children, onDismiss }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${TONES[tone]}`}
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
