"use client";

/** tabs: string[] or [{ key, label }]. Shared underline-tab pattern used
 * across every role workspace and the accounts directory detail view -
 * one implementation instead of five near-identical copies. */
export default function TabBar({ tabs, active, onChange }) {
  const items = tabs.map((t) => (typeof t === "string" ? { key: t, label: t } : t));
  return (
    <div className="mb-4 flex gap-1 border-b border-line">
      {items.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative px-3.5 py-2.5 text-sm font-medium transition-colors ${
            active === t.key
              ? "text-primary"
              : "text-muted hover:text-fg"
          }`}
        >
          {t.label}
          {active === t.key && (
            <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
