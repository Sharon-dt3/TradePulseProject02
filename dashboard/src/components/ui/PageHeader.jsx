"use client";

/**
 * Displays the consistent heading, supporting context, and optional action
 * area used at the top of each dashboard workspace.
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary">
          TradePulse
        </p>
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
