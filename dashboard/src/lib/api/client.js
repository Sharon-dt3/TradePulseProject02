import { supabase } from "@/lib/supabaseClient";

const LEDGER_CORE_URL =
  process.env.NEXT_PUBLIC_LEDGER_CORE_URL ?? "http://localhost:8080";
const RISK_ENGINE_URL =
  process.env.NEXT_PUBLIC_RISK_ENGINE_URL ?? "http://localhost:8001";

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

async function baseFetch(baseUrl, path, options = {}) {
  const headers = {
    ...(await authHeaders()),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.message ??
      body?.detail ??
      `Request to ${path} failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.code = body?.code;
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Calls a ledger-core endpoint with the current session's token
 * attached. Throws with the backend's message (either the {code,
 * message} shape, or a bean-validation 400's {message}-less shape
 * falling back to a generic string) on a non-2xx response.
 */
export function ledgerCoreFetch(path, options = {}) {
  return baseFetch(LEDGER_CORE_URL, path, options);
}

/** Same contract as ledgerCoreFetch, pointed at risk-engine instead. */
export function riskEngineFetch(path, options = {}) {
  return baseFetch(RISK_ENGINE_URL, path, options);
}
