"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { navItemsForRoles } from "@/lib/roles";

export default function AppShell({ children }) {
  const { user, roles, signOut } = useAuth();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const navItems = navItemsForRoles(roles);

  if (!user) return children;

  const initial = user.email?.[0]?.toUpperCase() ?? "?";
  const nav = (
    <nav aria-label="Primary navigation" className="space-y-0.5 p-3">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setNavOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`relative block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white/90"
            }`}
          >
            {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-white" />}
            {item.label}
          </Link>
        );
      })}
      {navItems.length === 0 && <p className="px-3.5 py-2 text-xs text-white/50">No roles assigned yet.</p>}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded bg-surface px-4 py-2 text-sm font-semibold text-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <aside className="hidden w-60 shrink-0 flex-col bg-[#0a2540] text-white/90 md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <span className="font-serif-display text-lg font-semibold tracking-tight text-white">TradePulse</span>
          <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/45">Brokerage workspace</p>
        </div>
        <div className="flex-1">{nav}</div>
        <div className="border-t border-white/10 p-3 text-[0.7rem] uppercase tracking-[0.08em] text-white/35">
          Demo environment
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 items-center justify-between border-b border-line bg-surface px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-primary-soft md:hidden"
            aria-label="Open navigation"
            aria-expanded={navOpen}
          >
            Menu
          </button>
          <div className="flex items-center gap-2.5 md:ml-auto">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initial}
            </span>
            <span className="hidden text-sm text-fg sm:inline">{user.email}</span>
            <button onClick={signOut} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-primary-soft hover:text-fg">
              Sign out
            </button>
          </div>
        </header>

        {navOpen && (
          <div className="fixed inset-0 z-50 bg-black/45 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <aside className="flex h-full w-72 flex-col bg-[#0a2540] text-white shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                <span className="font-serif-display text-lg font-semibold">TradePulse</span>
                <button onClick={() => setNavOpen(false)} className="rounded p-1 text-white/75 hover:bg-white/10" aria-label="Close navigation">
                  ×
                </button>
              </div>
              <div className="flex-1">{nav}</div>
            </aside>
          </div>
        )}

        <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden bg-bg p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
