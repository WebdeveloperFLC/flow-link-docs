import { supabase } from "@/integrations/supabase/client";

export type PaymentApproverCheck = {
  canApprove: boolean;
  canRecord: boolean;
  isAccounts: boolean;
  isAdmin: boolean;
  isAuthorizedManager: boolean;
};

/** Accountant, Finance, authorized Branch Manager, or Super Admin may approve payments and issue final receipts. */
export async function checkPaymentPermissions(userId: string): Promise<PaymentApproverCheck> {
  const [{ data: au }, { data: roles }, { data: profile }] = await Promise.all([
    supabase
      .from("accounting_users")
      .select("id")
      .eq("auth_user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("can_approve_payments").eq("id", userId).maybeSingle(),
  ]);

  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  const isAdmin = roleList.includes("admin");
  const isManager = roleList.includes("manager");
  const isAccounts = !!au || isAdmin;
  const isAuthorizedManager = isManager && !!(profile as { can_approve_payments?: boolean } | null)?.can_approve_payments;

  let canApprove = isAccounts || isAuthorizedManager;
  if (!canApprove) {
    const { data: rpc } = await supabase.rpc("can_approve_payment", { _uid: userId });
    canApprove = !!rpc;
  }

  return {
    canApprove,
    canRecord: true,
    isAccounts,
    isAdmin,
    isAuthorizedManager,
  };
}

export function paymentStatusLabel(status: string | null | undefined, method?: string | null): string {
  if (method === "cash" && status === "awaiting_verification") {
    return "Pending cash verification";
  }
  switch (status) {
    case "verified":
      return "Confirmed";
    case "awaiting_verification":
      return "Pending Verification";
    case "rejected":
      return "Rejected";
    default:
      return (status ?? "pending").replace(/_/g, " ");
  }
}
