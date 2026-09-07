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
      <p className="px-3 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#71809a]">
        Workspace
      </p>
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setNavOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
              active
                ? "bg-[#173f43] text-[#8af4e2] shadow-[inset_0_0_0_1px_rgba(85,230,208,0.16)]"
                : "text-[#9cacC6] hover:bg-[#17243a] hover:text-white"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                active ? "bg-primary shadow-[0_0_10px_rgba(45,212,191,0.9)]" : "bg-[#51617b] group-hover:bg-[#9db0cc]"
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
    <div className="flex min-h-screen bg-[#09111f]">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#1d2b43] bg-[#0b1526] md:flex">
        <div className="border-b border-[#1d2b43] px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-fg shadow-[0_0_22px_rgba(45,212,191,0.24)]">
              T
            </span>
            <span className="text-lg font-bold tracking-tight text-white">TradePulse</span>
          </div>
          <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#71809a]">
            Trading terminal
          </p>
        </div>
        <div className="flex-1">{nav}</div>
        <div className="m-3 rounded-lg border border-[#24404d] bg-[#0d2630] px-3 py-2.5">
          <p className="flex items-center gap-2 text-[0.67rem] font-bold uppercase tracking-[0.08em] text-[#78e6d5]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(45,212,191,1)]" />
            Secure session
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 items-center justify-between border-b border-[#1d2b43] bg-[#0d1729]/90 px-4 backdrop-blur-xl md:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-fg hover:border-primary/50 md:hidden"
            aria-label="Open navigation"
            aria-expanded={navOpen}
          >
            Menu
          </button>
          <div className="hidden items-center gap-2 text-xs font-medium text-muted md:flex">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_0_4px_rgba(66,211,146,0.12)]" />
            Systems operational
          </div>
          <div className="flex items-center gap-3 md:ml-auto">
            <span className="hidden text-xs text-muted sm:inline">Signed in as</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#193451] text-xs font-bold text-[#9ed1ff] ring-1 ring-[#305274]">
              {initial}
            </span>
            <span className="hidden max-w-48 truncate text-sm font-medium text-fg lg:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-[#17243a] hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        {navOpen && (
          <div
            className="fixed inset-0 z-50 bg-[#020712]/70 backdrop-blur-sm md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <aside className="flex h-full w-72 flex-col border-r border-[#263754] bg-[#0b1526] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1d2b43] px-5 py-5">
                <div>
                  <p className="text-lg font-bold text-white">TradePulse</p>
                  <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#71809a]">
                    Trading terminal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  className="rounded-lg px-2.5 py-1 text-lg text-muted hover:bg-[#17243a] hover:text-white"
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
          <div className="mx-auto max-w-[96rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
