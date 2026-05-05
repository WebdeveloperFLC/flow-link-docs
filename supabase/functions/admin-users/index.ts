import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VALID_ROLES = ["admin", "counselor", "documentation", "viewer"] as const;
type Role = typeof VALID_ROLES[number];

async function findUserByEmail(svc: ReturnType<typeof createClient>, email: string) {
  // Page through users (small team app)
  let page = 1;
  while (true) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function logActivity(svc: ReturnType<typeof createClient>, userId: string, action: string, entityId: string | null, details: Record<string, unknown>) {
  await svc.from("activity_logs").insert({
    user_id: userId,
    action,
    entity_type: "user",
    entity_id: entityId,
    details,
  });
}

async function adminCount(svc: ReturnType<typeof createClient>) {
  const { count } = await svc.from("user_roles").select("user_id", { head: true, count: "exact" }).eq("role", "admin");
  return count ?? 0;
}

async function reassignAll(svc: ReturnType<typeof createClient>, fromId: string, toId: string) {
  await svc.from("clients").update({ owner_id: toId }).eq("owner_id", fromId);
  await svc.from("clients").update({ created_by: toId }).eq("created_by", fromId);
  await svc.from("client_documents").update({ uploaded_by: toId }).eq("uploaded_by", fromId);
  await svc.from("binders").update({ generated_by: toId }).eq("generated_by", fromId);
  await svc.from("client_access").update({ user_id: toId }).eq("user_id", fromId);
  await svc.from("letter_templates").update({ created_by: toId }).eq("created_by", fromId);
  await svc.from("activity_logs").update({ user_id: toId }).eq("user_id", fromId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdminData } = await svc.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdminData) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      const { first_name, last_name, email, phone, role } = body as Record<string, string>;
      if (!first_name || !last_name || !email || !phone || !role) return json({ error: "Missing fields" }, 400);
      if (!VALID_ROLES.includes(role as Role)) return json({ error: "Invalid role" }, 400);

      const existing = await findUserByEmail(svc, email);
      if (existing) return json({ error: "Email already registered" }, 409);

      const redirectTo = `${req.headers.get("origin") ?? ""}/reset-password`;
      const { data: invited, error: invErr } = await svc.auth.admin.inviteUserByEmail(email, {
        data: { full_name: `${first_name} ${last_name}` },
        redirectTo,
      });
      if (invErr || !invited?.user) return json({ error: invErr?.message ?? "Invite failed" }, 400);
      const newId = invited.user.id;

      await svc.from("profiles").upsert({
        id: newId,
        email,
        full_name: `${first_name} ${last_name}`,
        first_name, last_name, phone,
        status: "active",
      });
      await svc.from("user_roles").delete().eq("user_id", newId);
      await svc.from("user_roles").insert({ user_id: newId, role });
      await logActivity(svc, callerId, "user.created", newId, { email, role });
      return json({ ok: true, user_id: newId });
    }

    if (action === "update") {
      const { user_id, first_name, last_name, phone, role } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const patch: Record<string, unknown> = {};
      if (first_name !== undefined) patch.first_name = first_name;
      if (last_name !== undefined) patch.last_name = last_name;
      if ((first_name ?? last_name) !== undefined) patch.full_name = `${first_name ?? ""} ${last_name ?? ""}`.trim();
      if (phone !== undefined) patch.phone = phone;
      if (Object.keys(patch).length) await svc.from("profiles").update(patch).eq("id", user_id);
      if (role) {
        if (!VALID_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);
        // last-admin guard
        const { data: existingRoles } = await svc.from("user_roles").select("role").eq("user_id", user_id);
        const wasAdmin = (existingRoles ?? []).some((r) => r.role === "admin");
        if (wasAdmin && role !== "admin" && (await adminCount(svc)) <= 1) {
          return json({ error: "Cannot demote the last administrator" }, 400);
        }
        await svc.from("user_roles").delete().eq("user_id", user_id);
        await svc.from("user_roles").insert({ user_id, role });
      }
      await logActivity(svc, callerId, "user.updated", user_id, { ...patch, role });
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { email } = body;
      if (!email) return json({ error: "email required" }, 400);
      const redirectTo = `${req.headers.get("origin") ?? ""}/reset-password`;
      const { error } = await svc.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return json({ error: error.message }, 400);
      await logActivity(svc, callerId, "user.password_reset", null, { email });
      return json({ ok: true });
    }

    if (action === "suspend" || action === "revoke") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      // last-admin guard
      const { data: r } = await svc.from("user_roles").select("role").eq("user_id", user_id);
      if ((r ?? []).some((x) => x.role === "admin") && (await adminCount(svc)) <= 1) {
        return json({ error: "Cannot suspend/revoke the last administrator" }, 400);
      }
      const status = action === "suspend" ? "suspended" : "revoked";
      await svc.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
      await svc.from("profiles").update({ status, suspended_at: new Date().toISOString() }).eq("id", user_id);
      await logActivity(svc, callerId, `user.${action}`, user_id, {});
      return json({ ok: true });
    }

    if (action === "restore") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      await svc.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      await svc.from("profiles").update({ status: "active", suspended_at: null }).eq("id", user_id);
      await logActivity(svc, callerId, "user.restored", user_id, {});
      return json({ ok: true });
    }

    if (action === "transfer_data") {
      const { from_user_id, to_user_id } = body;
      if (!from_user_id || !to_user_id) return json({ error: "from/to required" }, 400);
      await reassignAll(svc, from_user_id, to_user_id);
      await logActivity(svc, callerId, "user.data_transferred", from_user_id, { to_user_id });
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id, transfer_to, keep } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const { data: r } = await svc.from("user_roles").select("role").eq("user_id", user_id);
      if ((r ?? []).some((x) => x.role === "admin") && (await adminCount(svc)) <= 1) {
        return json({ error: "Cannot delete the last administrator" }, 400);
      }
      if (!keep && !transfer_to) return json({ error: "Choose transfer_to or keep=true" }, 400);
      if (transfer_to) await reassignAll(svc, user_id, transfer_to);
      // Soft delete: mark profile, ban, but keep auth user so audit refs remain valid when keep=true.
      await svc.from("profiles").update({ status: "deleted", deleted_at: new Date().toISOString() }).eq("id", user_id);
      await svc.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
      // If transfer chosen, fully remove auth user
      if (transfer_to) {
        await svc.from("user_roles").delete().eq("user_id", user_id);
        await svc.auth.admin.deleteUser(user_id);
      }
      await logActivity(svc, callerId, "user.deleted", user_id, { transfer_to: transfer_to ?? null, keep: !!keep });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-users error", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});