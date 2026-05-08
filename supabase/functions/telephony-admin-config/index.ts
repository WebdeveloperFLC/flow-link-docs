// Admin-only edge function to manage TeleCMI provider credentials.
// - GET: returns masked previews (last 4 chars) of stored values, never raw secrets.
// - POST: upserts provided fields (only non-empty fields are updated).
// Access is restricted to authenticated users with the `admin` role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FIELDS = ["app_id", "secret", "webhook_secret", "from_number"] as const;
type Field = typeof FIELDS[number];

function mask(value: string | null | undefined): { set: boolean; preview: string | null; length: number } {
  if (!value) return { set: false, preview: null, length: 0 };
  const trimmed = String(value);
  if (trimmed.length === 0) return { set: false, preview: null, length: 0 };
  const tail = trimmed.slice(-4);
  return { set: true, preview: `••••${tail}`, length: trimmed.length };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  // Verify caller and admin role using a user-scoped client
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });

  const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || !isAdmin) return json(403, { error: "Forbidden" });

  // Use service role for actual reads/writes to bypass RLS reliably and never echo secrets
  const admin = createClient(url, serviceKey);

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("telephony_provider_settings")
      .select("provider, app_id, secret, webhook_secret, from_number, updated_at, updated_by")
      .eq("id", "global")
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    const row = data ?? {};
    return json(200, {
      provider: row.provider ?? "telecmi",
      updated_at: row.updated_at ?? null,
      updated_by: row.updated_by ?? null,
      fields: {
        app_id: mask(row.app_id),
        secret: mask(row.secret),
        webhook_secret: mask(row.webhook_secret),
        from_number: mask(row.from_number),
      },
    });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const update: Record<string, unknown> = {
      id: "global",
      provider: typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : "telecmi",
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    };

    let touched = 0;
    for (const f of FIELDS) {
      const v = body[f];
      if (typeof v !== "string") continue;
      const trimmed = v.trim();
      // Empty string => clear; non-empty => set. Skip undefined/null entirely.
      update[f] = trimmed.length ? trimmed : null;
      touched++;
    }

    if (touched === 0) return json(400, { error: "No fields to update" });

    // Basic validation
    if (typeof update.app_id === "string" && update.app_id && !/^[A-Za-z0-9_-]{2,64}$/.test(update.app_id as string)) {
      return json(400, { error: "Invalid app_id format" });
    }
    if (typeof update.from_number === "string" && update.from_number && !/^\+?[0-9 ()-]{4,20}$/.test(update.from_number as string)) {
      return json(400, { error: "Invalid from_number format" });
    }

    const { error } = await admin
      .from("telephony_provider_settings")
      .upsert(update, { onConflict: "id" });
    if (error) return json(500, { error: error.message });

    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed" });
});