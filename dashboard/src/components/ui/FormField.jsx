export default function FormField({ label, error, children, hint }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
        {label}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20";
