import { supabase } from "@/integrations/supabase/client";

type AdminUsersResult<T = unknown> = T & { ok?: boolean; error?: string };

const parseErrorBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    const body = JSON.parse(text) as { error?: unknown; message?: unknown };
    return String(body.error ?? body.message ?? text);
  } catch {
    return text;
  }
};

export async function callAdminUsers<T = AdminUsersResult>(body: Record<string, unknown>): Promise<T> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (sessionError || !token) {
    throw new Error("No active admin session. Please sign in again, then retry.");
  }

  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach admin-users edge function. Ask Lovable to deploy admin-users on Supabase.",
    );
  }

  if (!response.ok) {
    throw new Error((await parseErrorBody(response)) ?? `Request failed with status ${response.status}`);
  }

  const data = (await response.json()) as AdminUsersResult<T>;
  if (data?.error) throw new Error(data.error);
  return data as T;
}