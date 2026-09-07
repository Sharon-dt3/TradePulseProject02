export default function Card({ title, action, className = "", children }) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] transition-shadow ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          {title && (
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
