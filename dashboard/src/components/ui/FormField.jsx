export default function FormField({ label, error, children, hint }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-fg">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary";
