"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { navItemsForRoles } from "@/lib/roles";

/**
 * Provides the authenticated application frame, responsive navigation, and
 * account controls used by every TradePulse workspace.
 */
export default function AppShell({ children }) {
  const { user, roles, signOut } = useAuth();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const navItems = navItemsForRoles(roles);

  if (!user) return children;

  const initial = user.email?.[0]?.toUpperCase() ?? "?";
  const nav = (
    <nav aria-label="Primary navigation" className="space-y-1 px-3 py-4">
      <p className="px-3 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#718097]">
        Your workspace
      </p>
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setNavOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold ${
              active
                ? "bg-[#e0f1ee] text-[#075e58]"
                : "text-[#3f5067] hover:bg-[#edf1f4] hover:text-[#14243a]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                active ? "bg-primary" : "bg-[#a4b0bf] group-hover:bg-[#5b6d82]"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
      {navItems.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted">No roles assigned yet.</p>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#d9e0e8] bg-white md:flex">
        <div className="border-b border-[#d9e0e8] px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#103b62] text-sm font-black text-white">
              T
            </span>
            <span className="text-lg font-bold tracking-tight text-[#14243a]">TradePulse</span>
          </div>
          <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#718097]">
            Investment workspace
          </p>
        </div>
        <div className="flex-1">{nav}</div>
        <div className="m-3 rounded-md border border-[#d7e8e4] bg-[#f1faf8] px-3 py-2.5">
          <p className="flex items-center gap-2 text-[0.67rem] font-bold uppercase tracking-[0.08em] text-[#17675c]">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Secure session
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 items-center justify-between border-b border-[#d9e0e8] bg-white px-4 md:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-fg hover:bg-primary-soft md:hidden"
            aria-label="Open navigation"
            aria-expanded={navOpen}
          >
            Menu
          </button>
          <div className="hidden items-center gap-2 text-xs font-medium text-muted md:flex">
            <span className="h-2 w-2 rounded-full bg-success" />
            Account access secured
          </div>
          <div className="flex items-center gap-3 md:ml-auto">
            <span className="hidden text-xs text-muted sm:inline">Signed in as</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f0f8] text-xs font-bold text-[#1c5d99] ring-1 ring-[#cbdae9]">
              {initial}
            </span>
            <span className="hidden max-w-48 truncate text-sm font-medium text-fg lg:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-[#edf1f4] hover:text-fg"
            >
              Sign out
            </button>
          </div>
        </header>

        {navOpen && (
          <div
            className="fixed inset-0 z-50 bg-[#14243a]/35 backdrop-blur-sm md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <aside className="flex h-full w-72 flex-col border-r border-[#d9e0e8] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#d9e0e8] px-5 py-5">
                <div>
                  <p className="text-lg font-bold text-[#14243a]">TradePulse</p>
                  <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#718097]">
                    Investment workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  className="rounded-md px-2.5 py-1 text-lg text-muted hover:bg-[#edf1f4] hover:text-fg"
                  aria-label="Close navigation"
                >
                  ×
                </button>
              </div>
              <div className="flex-1">{nav}</div>
            </aside>
          </div>
        )}

        <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-5 lg:p-6">
          <div className="mx-auto max-w-[90rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
