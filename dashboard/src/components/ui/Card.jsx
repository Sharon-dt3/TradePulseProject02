export default function Card({ title, action, className = "", children }) {
  return (
    <div className={`rounded-lg border border-line bg-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
