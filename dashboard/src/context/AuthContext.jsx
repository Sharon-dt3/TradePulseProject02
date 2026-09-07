"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { decodeRoles } from "@/lib/roles";

const AuthContext = createContext(undefined);

/**
 * Tracks the current Supabase session for the whole app, plus the
 * signed-in user's roles (decoded client-side from the JWT's
 * "user_role" claim - see lib/roles.js). Nothing else should call
 * supabase.auth directly for sign-in/sign-out/session reads — this is
 * the one place that state lives, same reasoning as AccountService
 * being the one place ledger-core's ownership rule lives.
 *
 * roles is purely a UI-gating convenience (which nav links/pages to
 * show) - every real permission check still happens server-side on
 * every request, regardless of what this says.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  const roles = decodeRoles(session?.access_token);

  const value = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
