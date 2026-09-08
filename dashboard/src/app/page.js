"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { decodeRoles } from "@/lib/roles";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import AnimatedMarketBackdrop from "@/components/ui/AnimatedMarketBackdrop";

const SIGN_IN_ROLES = [
  { role: "trader", label: "Trader", description: "Orders, positions, and markets", href: "/trader" },
  { role: "viewer", label: "Viewer", description: "Read-only account access", href: "/viewer" },
  { role: "admin", label: "Admin", description: "Users, accounts, and oversight", href: "/admin" },
  { role: "compliance", label: "Compliance", description: "Cases, controls, and audit trail", href: "/compliance" },
  { role: "risk_manager", label: "Risk Manager", description: "Firm-wide risk visibility", href: "/risk" },
];

export default function Home() {
  const { user, loading, signIn, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState(SIGN_IN_ROLES[0]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    const signedInRoles = decodeRoles(data?.session?.access_token);
    if (!signedInRoles.includes(selectedRole.role)) {
      await signOut();
      setError(
        `This account is not authorized for the ${selectedRole.label} workspace. Please choose an authorized role and try again.`
      );
      return;
    }

    router.replace(selectedRole.href);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading secure workspace…</div>;
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted">
        Signed in — no dashboard view is unlocked for your current roles yet.
      </div>
    );
  }

  return (
    <main className="sign-in-workspace grid min-h-screen overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(26rem,0.9fr)]">
      <AnimatedMarketBackdrop />
      <section className="relative z-10 hidden overflow-hidden border-r border-[#b77b88]/40 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(45,212,191,0.18),transparent_26rem),radial-gradient(circle_at_85%_80%,rgba(72,112,255,0.17),transparent_25rem)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-fg shadow-[0_0_28px_rgba(45,212,191,0.25)]">
            T
          </span>
          <div>
            <p className="text-xl font-bold tracking-tight text-[#741b32]">TradePulse</p>
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.15em] text-[#8190aa]">Trading terminal</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">Market intelligence</p>
          <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight text-black">
            Make every market move with clarity.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-black">
            A focused workspace for positions, orders, live market context, and risk visibility.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs font-medium text-[#9aacC6]">
          <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_10px_rgba(66,211,146,0.8)]" />
          Secure, role-based account access
        </div>
      </section>

      <section className="relative z-10 flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-[#fffaf9]/85 p-5 shadow-[0_18px_45px_rgba(92,30,48,0.16)] backdrop-blur-sm sm:p-7">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-fg">T</span>
              <span className="text-lg font-bold text-[#741b32]">TradePulse</span>
            </div>
          </div>

          <p className="text-[0.67rem] font-bold uppercase tracking-[0.15em] text-primary">Secure access</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#741b32]">Welcome back</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Choose the workspace you want to open, then sign in with your assigned account.
          </p>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Sign in as</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SIGN_IN_ROLES.map((role) => {
                const isSelected = selectedRole.role === role.role;
                return (
                  <button
                    key={role.role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    aria-pressed={isSelected}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-primary-fg shadow-sm"
                        : "border-line bg-surface text-fg hover:border-[#caa9af] hover:bg-primary-soft"
                    }`}
                  >
                    <span className="block text-sm font-bold">{role.label}</span>
                    <span className={`mt-0.5 block text-xs ${isSelected ? "text-white/80" : "text-muted"}`}>
                      {role.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <FormField label="Email address">
              <input
                className={inputCls}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </FormField>
            <FormField label="Password">
              <input
                className={inputCls}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </FormField>
            <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>
            <Button type="submit" loading={submitting} className="mt-2 w-full">
              Sign in as {selectedRole.label}
            </Button>
          </form>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Your available workspace is determined by your assigned role after authentication.
          </p>
        </div>
      </section>
    </main>
  );
}
