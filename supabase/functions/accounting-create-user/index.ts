import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const VALID_ROLES = [
  "SUPER_ADMIN","FINANCE_ADMIN","ACCOUNTANT","AUDITOR",
  "FINAL_AUDITOR","BRANCH_MANAGER","COMPLIANCE_OFFICER","VIEWER",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Not authenticated" }, 401);
    }

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check admin (uses our SECURITY DEFINER function) — bootstrap allowed if table empty
    const { data: isAdmin } = await admin.rpc("is_accounting_admin", { _uid: callerId });
    if (!isAdmin) return json({ error: "Only accounting admins can create users" }, 403);

    const body = await req.json();
    const { name, email, password, role, entity_scope } = body ?? {};
    if (!name || !email || !password || !role) {
      return json({ error: "name, email, password, role are required" }, 400);
    }
    if (!VALID_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);
    if (String(password).length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    const scope: string[] = Array.isArray(entity_scope) && entity_scope.length ? entity_scope : ["*"];

    // Create auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: name, signup_role: "accounting" },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message || "Failed to create auth user" }, 400);
    }

    // Insert accounting profile row
    const { data: row, error: insertErr } = await admin
      .from("accounting_users")
      .insert({
        auth_user_id: created.user.id,
        name,
        email: String(email).trim().toLowerCase(),
        role,
        entity_scope: scope,
        status: "ACTIVE",
        mfa_enabled: false,
      })
      .select()
      .single();

    if (insertErr) {
      // rollback auth user on failure
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: insertErr.message }, 400);
    }

    return json({ user: row });
  } catch (e) {
    console.error("accounting-create-user error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}