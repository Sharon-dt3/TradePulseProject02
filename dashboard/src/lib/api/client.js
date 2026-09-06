import { supabase } from "@/lib/supabaseClient";

const LEDGER_CORE_URL =
  process.env.NEXT_PUBLIC_LEDGER_CORE_URL ?? "http://localhost:8080";

/**
 * Returns the Authorization header for the current session, or an
 * empty object if no one is signed in. Every outgoing request to
 * gateway/ledger-core/risk-engine should spread this into its headers
 * — this is the one place that knows how to attach a token, so no
 * route call is ever built without it by accident.
 */
export async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {};
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Calls a ledger-core endpoint with the current session's token
 * attached. Throws with the backend's message (API.md's {code, message}
 * error shape) on a non-2xx response, so a caller can show the real
 * reason instead of a generic "request failed" — same reasoning as
 * authHeaders: one place that knows how to talk to ledger-core, so no
 * call site reinvents error handling.
 */
export async function ledgerCoreFetch(path, options = {}) {
  const headers = {
    ...(await authHeaders()),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${LEDGER_CORE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.message ?? `Request to ${path} failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}