export default function FormField({ label, error, children, hint }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[0.66rem] font-bold uppercase tracking-[0.09em] text-muted">
        {label}
      </span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-[#0b1628] px-3 py-2.5 text-sm text-fg placeholder:text-[#687994] outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20";
