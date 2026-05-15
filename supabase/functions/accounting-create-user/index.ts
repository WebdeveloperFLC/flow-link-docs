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

    const normalizedEmail = String(email).trim().toLowerCase();
    let authUserId: string | null = null;
    let createdHere = false;

    // Try to create auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: name, signup_role: "accounting" },
    });

    if (created?.user) {
      authUserId = created.user.id;
      createdHere = true;
    } else {
      // If user already exists in auth, find them and reset their password
      const msg = (createErr?.message || "").toLowerCase();
      const alreadyExists = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
      if (!alreadyExists) {
        return json({ error: createErr?.message || "Failed to create auth user" }, 400);
      }

      // Look up existing auth user by email (paginate just in case)
      let found: { id: string } | null = null;
      for (let page = 1; page <= 20 && !found; page++) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) return json({ error: listErr.message }, 400);
        const u = list.users.find((x) => (x.email || "").toLowerCase() === normalizedEmail);
        if (u) found = { id: u.id };
        if (list.users.length < 200) break;
      }
      if (!found) return json({ error: "Email exists in auth but user not found" }, 400);

      // Ensure not already linked in accounting_users
      const { data: existingRow } = await admin
        .from("accounting_users")
        .select("id")
        .eq("auth_user_id", found.id)
        .maybeSingle();
      if (existingRow) {
        return json({ error: "This user already has an accounting account" }, 400);
      }

      // Reset password to the admin-provided one and confirm email
      const { error: updErr } = await admin.auth.admin.updateUserById(found.id, {
        password: String(password),
        email_confirm: true,
        user_metadata: { full_name: name, signup_role: "accounting" },
      });
      if (updErr) return json({ error: updErr.message }, 400);
      authUserId = found.id;
    }

    // Insert accounting profile row
    const { data: row, error: insertErr } = await admin
      .from("accounting_users")
      .insert({
        auth_user_id: authUserId,
        name,
        email: normalizedEmail,
        role,
        entity_scope: scope,
        status: "ACTIVE",
        mfa_enabled: false,
      })
      .select()
      .single();

    if (insertErr) {
      // rollback auth user only if we created it in this call
      if (createdHere && authUserId) {
        await admin.auth.admin.deleteUser(authUserId);
      }
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