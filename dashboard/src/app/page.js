"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { navItemsForRoles } from "@/lib/roles";
import Button from "@/components/ui/Button";
import FormField, { inputCls } from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";

export default function Home() {
  const { user, roles, loading, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const items = navItemsForRoles(roles);
    if (items.length > 0) {
      router.replace(items[0].href);
    }
  }, [loading, user, roles, router]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) setError(signInError.message);
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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(26rem,0.9fr)]">
      <section className="relative hidden overflow-hidden border-r border-[#1d2b43] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(45,212,191,0.18),transparent_26rem),radial-gradient(circle_at_85%_80%,rgba(72,112,255,0.17),transparent_25rem)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-fg shadow-[0_0_28px_rgba(45,212,191,0.25)]">
            T
          </span>
          <div>
            <p className="text-xl font-bold tracking-tight text-white">TradePulse</p>
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

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-fg">T</span>
              <span className="text-lg font-bold text-white">TradePulse</span>
            </div>
          </div>

          <p className="text-[0.67rem] font-bold uppercase tracking-[0.15em] text-primary">Secure access</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">Sign in to open your personalized trading workspace.</p>

          <form onSubmit={handleSignIn} className="mt-7 space-y-4">
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
              Open workspace
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
