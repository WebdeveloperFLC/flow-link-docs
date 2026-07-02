import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Building2, GraduationCap, PauseCircle, Clock } from "lucide-react";

type CommissionStatusRow = {
  student_commission_id: string;
  institution_id: string | null;
  institution_name: string | null;
  program_name: string | null;
  intake_term: string | null;
  commission_period_code: string | null;
  eligibility_status: string | null;
  claim_status: string | null;
  payment_status: string | null;
  hold_status: string | null;
  hold_reason: string | null;
  eligibility_date: string | null;
  expected_claim_date: string | null;
  legacy_status: string | null;
};

const STATUS_TONE: Record<string, string> = {
  eligible: "bg-green-100 text-green-800 border-green-300",
  pending: "bg-gray-100 text-gray-700 border-gray-300",
  ineligible: "bg-red-100 text-red-800 border-red-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  ready: "bg-blue-100 text-blue-800 border-blue-300",
  submitted: "bg-indigo-100 text-indigo-800 border-indigo-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  unpaid: "bg-gray-100 text-gray-600 border-gray-300",
  active: "bg-amber-100 text-amber-900 border-amber-300",
};

function Chip({ label }: { label: string }) {
  const key = label.split(": ").pop()?.toLowerCase() ?? label;
  const cls = STATUS_TONE[key] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {label}
    </span>
  );
}

/**
 * Counselor-safe commission status — no amounts (v_client_commission_status).
 */
export function ClientCommissionStatusPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<CommissionStatusRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_client_commission_status" as any)
      .select("*")
      .eq("client_id", clientId)
      .order("eligibility_date", { ascending: false });
    if (!error) setRows((data ?? []) as CommissionStatusRow[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">Loading institution commission status…</Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        No institution commission records linked to this client yet.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="text-sm font-medium flex items-center gap-2">
          <GraduationCap className="size-4 text-muted-foreground" />
          Institution commission status
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Status only — amounts are confidential to commission admins.
        </p>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.student_commission_id} className="border rounded-md p-3 text-sm space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="font-medium flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {r.institution_name ?? "Institution"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.program_name}
                  {r.intake_term && ` · ${r.intake_term}`}
                  {r.commission_period_code && ` · ${r.commission_period_code}`}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.eligibility_status && <Chip label={`Eligibility: ${r.eligibility_status}`} />}
              {r.claim_status && <Chip label={`Claim: ${r.claim_status}`} />}
              {r.payment_status && <Chip label={`Payment: ${r.payment_status}`} />}
              {r.hold_status === "active" && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-800">
                  <PauseCircle className="size-3" /> On hold{r.hold_reason ? ` (${r.hold_reason})` : ""}
                </span>
              )}
            </div>
            {(r.eligibility_date || r.expected_claim_date) && (
              <div className="text-xs text-muted-foreground flex gap-3">
                {r.eligibility_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> Eligible {r.eligibility_date}
                  </span>
                )}
                {r.expected_claim_date && (
                  <span>Expected claim {r.expected_claim_date}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
