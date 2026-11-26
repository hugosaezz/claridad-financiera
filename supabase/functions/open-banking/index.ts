// Claridad Financiera — Supabase Edge Function: Enable Banking PSD2 Proxy
// 100% Free Personal Open Banking (PSD2 Read-Only Balances & Transactions)
// Secrets required (set via `supabase secrets set`):
//   ENABLE_BANKING_APP_ID        = Your Enable Banking Application ID (UUID)
//   ENABLE_BANKING_PRIVATE_KEY   = Contents of your PKCS#8 RSA private key (.pem)
//   ENABLE_BANKING_REDIRECT_URL  = Your app URL (e.g. https://hugosaezz.github.io/claridad-financiera/)
//
// Deploy with:
//   supabase functions deploy open-banking --no-verify-jwt

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ENABLE_API = "https://api.enablebanking.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(clean);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

async function createEnableBankingJWT(): Promise<string> {
  const appId = Deno.env.get("ENABLE_BANKING_APP_ID") || "";
  const privateKeyPem = (Deno.env.get("ENABLE_BANKING_PRIVATE_KEY") || "").replace(/\\n/g, "\n");
  if (!appId || !privateKeyPem) {
    throw new Error("ENABLE_BANKING_NOT_CONFIGURED");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "RS256", kid: appId };
  const payload = {
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: now,
    exp: now + 300,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sigBuf))}`;
}

async function enableFetch(path: string, method = "GET", body?: Record<string, unknown>) {
  const jwt = await createEnableBankingJWT();
  const res = await fetch(`${ENABLE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`EnableBanking ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "health") {
      const configured = Boolean(
        Deno.env.get("ENABLE_BANKING_APP_ID") && Deno.env.get("ENABLE_BANKING_PRIVATE_KEY"),
      );
      return new Response(JSON.stringify({ ok: true, configured }), { headers: CORS_HEADERS });
    }

    if (action === "list_aspsps") {
      const country = String(body?.country || "ES").toUpperCase();
      const data = await enableFetch(`/aspsps?country=${encodeURIComponent(country)}`);
      return new Response(JSON.stringify(data), { headers: CORS_HEADERS });
    }

    if (action === "start_auth") {
      const aspspName = String(body?.aspsp_name || "");
      const country = String(body?.country || "ES").toUpperCase();
      const redirectUrl = String(
        body?.redirect_url || Deno.env.get("ENABLE_BANKING_REDIRECT_URL") || "",
      );
      const state = String(body?.state || `claridad_bank_${crypto.randomUUID()}`);
      const validUntil = new Date(Date.now() + 90 * 86400 * 1000).toISOString();

      const data = await enableFetch("/auth", "POST", {
        access: { valid_until: validUntil },
        aspsp: { name: aspspName, country },
        state,
        redirect_url: redirectUrl,
        psu_type: "personal",
      });
      return new Response(JSON.stringify(data), { headers: CORS_HEADERS });
    }

    if (action === "complete_session") {
      const code = String(body?.code || "");
      if (!code) throw new Error("Missing OAuth code");
      const data = await enableFetch("/sessions", "POST", { code });
      return new Response(JSON.stringify(data), { headers: CORS_HEADERS });
    }

    if (action === "sync_account") {
      const accountUid = String(body?.account_uid || "");
      const dateFrom = String(body?.date_from || "");
      if (!accountUid) throw new Error("Missing account_uid");

      const [balances, txResp] = await Promise.all([
        enableFetch(`/accounts/${encodeURIComponent(accountUid)}/balances`),
        enableFetch(
          `/accounts/${encodeURIComponent(accountUid)}/transactions${dateFrom ? `?date_from=${encodeURIComponent(dateFrom)}` : ""}`,
        ),
      ]);
      return new Response(JSON.stringify({ balances, transactions: txResp }), {
        headers: CORS_HEADERS,
      });
    }

    if (action === "revoke_session") {
      const sessionId = String(body?.session_id || "");
      if (!sessionId) throw new Error("Missing session_id");
      const data = await enableFetch(`/sessions/${encodeURIComponent(sessionId)}`, "DELETE");
      return new Response(JSON.stringify({ revoked: true, data }), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg === "ENABLE_BANKING_NOT_CONFIGURED" ? 503 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS_HEADERS });
  }
});
