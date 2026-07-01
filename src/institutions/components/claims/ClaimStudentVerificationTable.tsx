import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Eye, CheckCircle2, Calculator, PauseCircle, PlayCircle, ArrowRightLeft, ArrowRightCircle, Link2, AlertTriangle, Pencil,
} from "lucide-react";
import type { ClaimStudentRow } from "../../lib/claimBusinessView";
import {
  commissionableTuition,
  expectedCommission,
  financialStatusLabel,
  financialVerificationStatus,
  hasOverride,
  institutionApprovedCommission,
  scholarshipAmount,
  businessNotes,
} from "../../lib/claimBusinessView";
import { ClaimStatusBadgeGroups } from "./ClaimStatusBadgeGroups";
import { ClaimStudentEditSheet } from "./ClaimStudentEditSheet";
import { canMarkEligible, isReadyForClaim, type LifecycleStudent } from "../CommissionLifecycleDialog";

const fmt = (n: number | null | undefined, ccy = "CAD") =>
  n == null ? "—" : `${ccy} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const NATIONALITY_FLAG: Record<string, string> = {
  Indian: "🇮🇳", India: "🇮🇳", Nigerian: "🇳🇬", Nigeria: "🇳🇬",
  Filipino: "🇵🇭", Philippines: "🇵🇭", Vietnamese: "🇻🇳", Vietnam: "🇻🇳",
  Bangladeshi: "🇧🇩", Bangladesh: "🇧🇩", Canadian: "🇨🇦", Canada: "🇨🇦",
  Chinese: "🇨🇳", China: "🇨🇳", Pakistani: "🇵🇰", Pakistan: "🇵🇰",
};

function studentFlag(s: ClaimStudentRow): string {
  const key = s.nationality ?? s.country_of_origin ?? "";
  return NATIONALITY_FLAG[key] ?? "🌐";
}

type Props = {
  rows: ClaimStudentRow[];
  onView: (s: ClaimStudentRow) => void;
  onLifecycle: (s: ClaimStudentRow, mode: "eligible" | "hold" | "release" | "transfer" | "transfer_outcome", transferId?: string) => void;
  onRecalc: (s: ClaimStudentRow) => void;
  onMoveCarryForward?: (s: ClaimStudentRow) => void;
  onExplainAmount: (s: ClaimStudentRow, type: "expected" | "approved" | "received" | "outstanding" | "commissionable") => void;
  transferByStudent: Map<string, { id: string }>;
  recalcBusyId?: string | null;
  onUpdated: () => void;
};

function ClickableAmount({
  value,
  onClick,
}: {
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right text-xs font-medium hover:underline hover:text-primary cursor-pointer"
      title="Click to explain this amount"
    >
      {value}
    </button>
  );
}

export function ClaimStudentVerificationTable({
  rows,
  onView,
  onLifecycle,
  onRecalc,
  onMoveCarryForward,
  onExplainAmount,
  transferByStudent,
  recalcBusyId,
  onUpdated,
}: Props) {
  const [editStudent, setEditStudent] = useState<ClaimStudentRow | null>(null);

  return (
    <>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Student</TableHead>
              <TableHead>Program / intake</TableHead>
              <TableHead className="text-right">Gross tuition</TableHead>
              <TableHead className="text-right">Scholarship</TableHead>
              <TableHead className="text-right">Commissionable</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead className="min-w-[160px]">Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const finLabel = financialStatusLabel(s, !!s.invoice_id);
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {studentFlag(s)} {s.student_name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.commission_period_label ?? s.commission_period_code ?? s.intake_term ?? "—"}
                    </div>
                    {hasOverride(s) && (
                      <span className="text-[10px] text-amber-700 font-medium">Override</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{s.program_name}</div>
                    <div className="text-muted-foreground">{s.intake_term ?? "—"} · {s.campus ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ClickableAmount
                      value={fmt(s.tuition_amount)}
                      onClick={() => onExplainAmount(s, "commissionable")}
                    />
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {scholarshipAmount(s) > 0 ? (
                      <ClickableAmount value={fmt(scholarshipAmount(s))} onClick={() => onExplainAmount(s, "expected")} />
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <ClickableAmount
                      value={fmt(commissionableTuition(s))}
                      onClick={() => onExplainAmount(s, "commissionable")}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <ClickableAmount
                      value={fmt(expectedCommission(s))}
                      onClick={() => onExplainAmount(s, "expected")}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {institutionApprovedCommission(s) != null ? (
                      <ClickableAmount
                        value={fmt(institutionApprovedCommission(s))}
                        onClick={() => onExplainAmount(s, "approved")}
                      />
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{financialVerificationStatus(s)}</TableCell>
                  <TableCell>
                    <ClaimStatusBadgeGroups student={s} financialLabel={finLabel} />
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground max-w-[140px] truncate" title={businessNotes(s)}>
                    {businessNotes(s)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 flex-wrap">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditStudent(s)} title="Edit business data">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => onView(s)}><Eye className="size-3.5" /></Button>
                      {canMarkEligible(s as LifecycleStudent) && (
                        <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => onLifecycle(s, "eligible")} title="Mark eligible & snapshot">
                          <CheckCircle2 className="size-3.5 text-green-600" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-1.5" disabled={recalcBusyId === s.id} onClick={() => onRecalc(s)}>
                        <Calculator className="size-3.5" />
                      </Button>
                      {s.hold_status !== "active" && s.eligibility_status !== "cancelled" && (
                        <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => onLifecycle(s, "hold")}>
                          <PauseCircle className="size-3.5" />
                        </Button>
                      )}
                      {s.hold_status === "active" && (
                        <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => onLifecycle(s, "release")}>
                          <PlayCircle className="size-3.5 text-blue-600" />
                        </Button>
                      )}
                      {!transferByStudent.has(s.id) && s.eligibility_status !== "cancelled" && (
                        <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => onLifecycle(s, "transfer")}>
                          <ArrowRightLeft className="size-3.5" />
                        </Button>
                      )}
                      {transferByStudent.has(s.id) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-1.5"
                          onClick={() => onLifecycle(s, "transfer_outcome", transferByStudent.get(s.id)!.id)}
                        >
                          <ArrowRightLeft className="size-3.5 text-amber-600" />
                        </Button>
                      )}
                      {s.claim_status === "carried_forward" && onMoveCarryForward && (
                        <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => onMoveCarryForward(s)}>
                          <ArrowRightCircle className="size-3.5" />
                        </Button>
                      )}
                      {!isReadyForClaim(s as LifecycleStudent) && s.hold_status === "active" && (
                        <Tooltip>
                          <TooltipTrigger><AlertTriangle className="size-3.5 text-amber-600" /></TooltipTrigger>
                          <TooltipContent>On hold — blocks submission</TooltipContent>
                        </Tooltip>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-1.5" disabled title="Coming soon">
                        <Link2 className="size-3.5 opacity-40" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ClaimStudentEditSheet
        student={editStudent}
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        onSaved={onUpdated}
      />
    </>
  );
}
