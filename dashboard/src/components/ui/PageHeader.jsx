"use client";

/**
 * Displays the consistent heading, supporting context, and optional action
 * area used at the top of each dashboard workspace.
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="mb-7 flex flex-col gap-4 border-b border-[#dfe4f2] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(79,70,229,0.12)]" />
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">
            TradePulse
          </p>
        </div>
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-fg sm:text-[2rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
