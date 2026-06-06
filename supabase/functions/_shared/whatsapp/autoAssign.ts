/** Phase 3 — auto-assign counselor after intake YES (branch + round-robin). */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export function autoAssignEnabled(): boolean {
  const v = (Deno.env.get("WHATSAPP_AUTO_ASSIGN") || "true").toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

export async function resolveBranchFromPreference(
  admin: SupabaseClient,
  preference: string | null | undefined,
): Promise<{ branchId: string | null; branchLabel: string | null }> {
  const raw = (preference || "").trim();
  if (!raw || /^(any|online|virtual|no preference|doesn'?t matter)$/i.test(raw)) {
    return { branchId: null, branchLabel: raw || null };
  }

  const { data: branches } = await admin
    .from("branches")
    .select("id, name, city")
    .eq("is_active", true);

  const lower = raw.toLowerCase();
  for (const b of branches ?? []) {
    const name = String(b.name || "").toLowerCase();
    const city = String(b.city || "").toLowerCase();
    if (lower === name || lower === city || lower.includes(name) || name.includes(lower)
      || (city && (lower.includes(city) || city.includes(lower)))) {
      return { branchId: b.id, branchLabel: b.name };
    }
  }

  return { branchId: null, branchLabel: raw };
}

export async function pickCounselorForAssignment(
  admin: SupabaseClient,
  opts: { branchId?: string | null },
): Promise<{ userId: string; fullName: string } | null> {
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "counselor");

  const counselorIds = [...new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id))];
  if (!counselorIds.length) return null;

  let profileQuery = admin
    .from("profiles")
    .select("id, full_name, branch_id, status")
    .in("id", counselorIds);

  const { data: profiles } = await profileQuery;
  let candidates = (profiles ?? []).filter(
    (p: { status?: string | null }) => (p.status ?? "active") === "active",
  );

  if (opts.branchId) {
    const branchMatched = candidates.filter((p: { branch_id?: string | null }) => p.branch_id === opts.branchId);
    if (branchMatched.length) candidates = branchMatched;
  }

  if (!candidates.length) return null;

  const ids = candidates.map((p: { id: string }) => p.id);
  const { data: loads } = await admin
    .from("whatsapp_conversations")
    .select("assigned_user_id")
    .in("assigned_user_id", ids)
    .eq("status", "assigned_active");

  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, 0);
  for (const row of loads ?? []) {
    const uid = row.assigned_user_id as string;
    counts.set(uid, (counts.get(uid) ?? 0) + 1);
  }

  candidates.sort((a: { id: string }, b: { id: string }) => {
    const ca = counts.get(a.id) ?? 0;
    const cb = counts.get(b.id) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.id.localeCompare(b.id);
  });

  const pick = candidates[0] as { id: string; full_name?: string | null };
  return { userId: pick.id, fullName: pick.full_name?.trim() || "Counselor" };
}

export async function applyWhatsAppAutoAssignment(
  admin: SupabaseClient,
  opts: {
    conversationId: string;
    leadId: string | null;
    counselorId: string;
    branchLabel?: string | null;
    contactName?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await admin.from("whatsapp_conversations").update({
    assigned_user_id: opts.counselorId,
    status: "assigned_active",
    updated_at: now,
  }).eq("id", opts.conversationId);

  await admin.from("whatsapp_conversation_assignments").insert({
    conversation_id: opts.conversationId,
    assigned_user_id: opts.counselorId,
    assigned_by_user_id: null,
  });

  if (opts.leadId) {
    await admin.from("leads").update({ assigned_counselor_id: opts.counselorId }).eq("id", opts.leadId);
  }
}

export async function notifyCounselorWhatsAppAssigned(
  admin: SupabaseClient,
  opts: {
    counselorId: string;
    conversationId: string;
    contactName?: string | null;
    branchLabel?: string | null;
  },
): Promise<void> {
  const name = opts.contactName?.trim() || "New contact";
  const branch = opts.branchLabel ? ` (${opts.branchLabel})` : "";

  try {
    await admin.from("app_notifications").upsert({
      user_id: opts.counselorId,
      category: "client_assigned",
      severity: "info",
      title: "WhatsApp helpline assigned",
      body: `${name}${branch} — new WhatsApp thread assigned to you.`,
      link: `/whatsapp`,
      entity_type: "whatsapp_conversation",
      entity_id: opts.conversationId,
      dedupe_key: `wa_assign:${opts.conversationId}:${opts.counselorId}`,
      is_read: false,
    }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
  } catch (e) {
    console.warn("[autoAssign] notification:", e);
  }
}
