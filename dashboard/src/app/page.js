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

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error.message);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted">Loading...</div>;
  }

  if (user) {
    return (
      <div className="flex h-64 items-center justify-center text-muted">
        Signed in — no dashboard view is unlocked for your current roles yet.
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-1 text-xl font-semibold text-fg">Sign in</h1>
      <p className="mb-6 text-sm text-muted">TradePulse Dashboard</p>
      <form onSubmit={handleSignIn} className="space-y-3">
        <FormField label="Email">
          <input
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            required
          />
        </FormField>
        <FormField label="Password">
          <input
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </FormField>
        <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>
        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
