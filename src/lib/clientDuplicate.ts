import { supabase } from "@/integrations/supabase/client";

export type ClientDuplicateMatch = {
  id: string;
  full_name: string | null;
  registration_number: string | null;
  application_id: string | null;
  email: string | null;
  phone: string | null;
  matchFields: Array<"email" | "phone">;
};

/** Active clients matching email or phone — duplicate guard for lead → client conversion. */
export async function findDuplicateClients(opts: {
  email?: string | null;
  phone?: string | null;
  excludeClientId?: string | null;
}): Promise<ClientDuplicateMatch[]> {
  const email = opts.email?.trim().toLowerCase();
  const phone = opts.phone?.trim();
  if (!email && !phone) return [];

  let q = supabase
    .from("clients")
    .select("id, full_name, registration_number, application_id, email, phone");

  if (opts.excludeClientId) q = q.neq("id", opts.excludeClientId);

  const orParts: string[] = [];
  if (email) orParts.push(`email.ilike.${email}`);
  if (phone) orParts.push(`phone.eq.${phone}`);
  if (orParts.length) q = q.or(orParts.join(","));

  const { data, error } = await q.limit(5);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      full_name: string | null;
      registration_number: string | null;
      application_id: string | null;
      email: string | null;
      phone: string | null;
    };
    const matchFields: Array<"email" | "phone"> = [];
    if (email && r.email?.trim().toLowerCase() === email) matchFields.push("email");
    if (phone && r.phone?.trim() === phone) matchFields.push("phone");
    return { ...r, matchFields };
  });
}

export function formatClientDuplicateMessage(match: ClientDuplicateMatch): string {
  const fields =
    match.matchFields.length === 2
      ? "email and phone"
      : match.matchFields[0] === "email"
        ? "email"
        : "phone";
  const label =
    match.full_name?.trim() ||
    match.registration_number ||
    match.application_id ||
    match.id.slice(0, 8);
  return `An existing client (${label}) already uses this ${fields}.`;
}
