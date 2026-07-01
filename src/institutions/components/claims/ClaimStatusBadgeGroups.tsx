import { Badge } from "@/components/ui/badge";
import type { ClaimStudentRow } from "../../lib/claimBusinessView";
import { academicStatusLabel } from "../../lib/claimBusinessView";

const ELIGIBILITY_CLS: Record<string, string> = {
  eligible: "bg-green-100 text-green-800",
  pending: "bg-gray-100 text-gray-700",
  ineligible: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
};

const CLAIM_CLS: Record<string, string> = {
  ready: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  carried_forward: "bg-amber-100 text-amber-900",
  not_ready: "bg-gray-100 text-gray-600",
};

const FINANCIAL_CLS: Record<string, string> = {
  Expected: "bg-slate-100 text-slate-800",
  "Invoice generated": "bg-purple-100 text-purple-800",
  "Partially paid": "bg-indigo-100 text-indigo-800",
  Paid: "bg-green-100 text-green-800",
  Adjusted: "bg-amber-100 text-amber-900",
  "Written off": "bg-red-100 text-red-800",
};

export function ClaimStatusBadgeGroups({
  student,
  financialLabel,
}: {
  student: ClaimStudentRow;
  financialLabel: string;
}) {
  const academic = academicStatusLabel(student.enrollment_status);
  const elig = student.eligibility_status ?? "pending";
  const claim = student.claim_status ?? "not_ready";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        <span className="text-[9px] uppercase text-muted-foreground w-full">Academic</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{academic}</Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-[9px] uppercase text-muted-foreground w-full">Eligibility</span>
        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${ELIGIBILITY_CLS[elig] ?? ""}`}>{elig}</Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-[9px] uppercase text-muted-foreground w-full">Claim</span>
        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${CLAIM_CLS[claim] ?? ""}`}>{claim.replace(/_/g, " ")}</Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-[9px] uppercase text-muted-foreground w-full">Financial</span>
        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${FINANCIAL_CLS[financialLabel] ?? "bg-slate-100"}`}>
          {financialLabel}
        </Badge>
      </div>
      {student.hold_status === "active" && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Hold: {student.hold_reason ?? "other"}</Badge>
      )}
    </div>
  );
}
