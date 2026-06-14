import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("E2E requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (staging only).");
  }
  if (!_client) _client = createClient(url, key);
  return _client;
}

export async function expectRow(
  db: SupabaseClient,
  table: string,
  filter: Record<string, unknown>,
) {
  let q = db.from(table).select("*");
  for (const [k, v] of Object.entries(filter)) {
    q = q.eq(k, v);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Missing row in ${table}: ${JSON.stringify(filter)}`);
  return data;
}
