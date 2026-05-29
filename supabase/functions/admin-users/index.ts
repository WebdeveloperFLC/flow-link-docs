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

const VALID_ROLES = ["admin", "commission_admin", "counselor", "documentation", "telecaller", "viewer"] as const;
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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdminData } = await svc.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdminData) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      const { first_name, last_name, email, phone, password, branch_id, department_id, designation } = body as Record<string, string>;
      const rolesIn: string[] = Array.isArray((body as any).roles) && (body as any).roles.length
        ? (body as any).roles
        : (body as any).role ? [(body as any).role] : [];
      if (!first_name || !last_name || !email || !phone || !password || rolesIn.length === 0) return json({ error: "Missing fields" }, 400);
      const invalid = rolesIn.find((r) => !VALID_ROLES.includes(r as Role));
      if (invalid) return json({ error: `Invalid role: ${invalid}` }, 400);
      if (password.length < 8 || password.length > 72) return json({ error: "Password must be 8–72 characters" }, 400);

      const existing = await findUserByEmail(svc, email);
      if (existing) return json({ error: "Email already registered" }, 409);

      const fullName = `${first_name} ${last_name}`;
      // Internal team accounts are provisioned by an administrator — auto-confirm so they can sign in immediately.
      const { data: created, error: createErr } = await svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr || !created?.user) {
        const raw = createErr?.message ?? "Create failed";
        const friendly = /weak|known to be|pwned|leaked/i.test(raw)
          ? "Password is too weak or has appeared in a known data breach. Use a longer password mixing upper/lowercase letters, numbers, and symbols."
          : raw;
        return json({ error: friendly }, 400);
      }
      const newId = created.user.id;

      await svc.from("profiles").upsert({
        id: newId,
        email,
        full_name: fullName,
        first_name, last_name, phone,
        branch_id: branch_id || null,
        department_id: department_id || null,
        designation: designation || null,
        status: "active",
      });
      await svc.from("user_roles").delete().eq("user_id", newId);
      await svc.from("user_roles").insert(rolesIn.map((role) => ({ user_id: newId, role })));
      await logActivity(svc, callerId, "user.created", newId, { email, roles: rolesIn });
      return json({ ok: true, user_id: newId });
    }

    if (action === "update") {
      const { user_id, first_name, last_name, phone, role } = body;
      const rolesIn: string[] | undefined = Array.isArray((body as any).roles) ? (body as any).roles : undefined;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const patch: Record<string, unknown> = {};
      if (first_name !== undefined) patch.first_name = first_name;
      if (last_name !== undefined) patch.last_name = last_name;
      if ((first_name ?? last_name) !== undefined) patch.full_name = `${first_name ?? ""} ${last_name ?? ""}`.trim();
      if (phone !== undefined) patch.phone = phone;
      if ((body as any).branch_id !== undefined) patch.branch_id = (body as any).branch_id || null;
      if ((body as any).department_id !== undefined) patch.department_id = (body as any).department_id || null;
      if ((body as any).designation !== undefined) patch.designation = (body as any).designation || null;
      if (Object.keys(patch).length) await svc.from("profiles").update(patch).eq("id", user_id);
      const nextRoles = rolesIn ?? (role ? [role] : undefined);
      if (nextRoles) {
        const bad = nextRoles.find((r) => !VALID_ROLES.includes(r));
        if (bad) return json({ error: `Invalid role: ${bad}` }, 400);
        // last-admin guard
        const { data: existingRoles } = await svc.from("user_roles").select("role").eq("user_id", user_id);
        const wasAdmin = (existingRoles ?? []).some((r) => r.role === "admin");
        if (wasAdmin && !nextRoles.includes("admin") && (await adminCount(svc)) <= 1) {
          return json({ error: "Cannot demote the last administrator" }, 400);
        }
        await svc.from("user_roles").delete().eq("user_id", user_id);
        await svc.from("user_roles").insert(nextRoles.map((r) => ({ user_id, role: r })));
      }
      await logActivity(svc, callerId, "user.updated", user_id, { ...patch, roles: nextRoles });
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, email, password } = body as Record<string, string>;
      if (!password || password.length < 8 || password.length > 72) {
        return json({ error: "Password must be 8–72 characters" }, 400);
      }
      let targetId = user_id;
      if (!targetId && email) {
        const found = await findUserByEmail(svc, email);
        if (!found) return json({ error: "User not found" }, 404);
        targetId = found.id;
      }
      if (!targetId) return json({ error: "user_id or email required" }, 400);
      const { error } = await svc.auth.admin.updateUserById(targetId, { password });
      if (error) {
        const raw = error.message ?? "Password update failed";
        const friendly = /weak|known to be|pwned|leaked|breach/i.test(raw)
          ? "Password has appeared in a known data breach. Use a longer, unique password mixing upper/lowercase, numbers, and symbols."
          : raw;
        return json({ error: friendly }, 400);
      }
      await logActivity(svc, callerId, "user.password_reset", targetId, {});
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