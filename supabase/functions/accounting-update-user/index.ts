import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const VALID_ROLES = [
  "SUPER_ADMIN","FINANCE_ADMIN","ACCOUNTANT","AUDITOR",
  "FINAL_AUDITOR","BRANCH_MANAGER","COMPLIANCE_OFFICER","VIEWER",
];
const VALID_STATUS = ["ACTIVE","SUSPENDED","INVITED"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: ce } = await userClient.auth.getClaims(token);
    if (ce || !claimsData?.claims?.sub) return json({ error: "Not authenticated" }, 401);
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("is_accounting_admin", { _uid: callerId });
    if (!isAdmin) return json({ error: "Only accounting admins can update users" }, 403);

    const { id, role, entity_scope, status, name } = await req.json();
    if (!id) return json({ error: "id is required" }, 400);

    const patch: Record<string, unknown> = {};
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);
      patch.role = role;
    }
    if (status !== undefined) {
      if (!VALID_STATUS.includes(status)) return json({ error: "Invalid status" }, 400);
      patch.status = status;
    }
    if (entity_scope !== undefined) {
      patch.entity_scope = Array.isArray(entity_scope) && entity_scope.length ? entity_scope : ["*"];
    }
    if (name !== undefined) patch.name = String(name);

    const { data: row, error } = await admin
      .from("accounting_users")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 400);

    // Mirror suspension to auth: ban/unban
    if (status && row?.auth_user_id) {
      const banDuration = status === "SUSPENDED" ? "876000h" : "none";
      // @ts-ignore — ban_duration is supported by GoTrue admin API
      await admin.auth.admin.updateUserById(row.auth_user_id, { ban_duration: banDuration });
    }

    return json({ user: row });
  } catch (e) {
    console.error("accounting-update-user error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}