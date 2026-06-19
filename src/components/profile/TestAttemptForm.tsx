import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LinkedDocumentsPanel, type LinkedDocumentOption } from "@/components/profile/LinkedDocumentsPanel";
import { FRENCH_EXAMS, GERMAN_EXAMS } from "@/lib/languageTests";
import {
  showIeltsVariant,
  statusLabel,
  visibilityForAttemptStatus,
} from "@/lib/profile/testAttemptFormRules";
import {
  testIdToLegacyAptitude,
  testIdToLegacyEnglish,
  testLabel,
} from "@/lib/profile/profileTestCatalog";
import type { IeltsVariant, ProfileTestStatus, TestAttempt } from "@/lib/profile/types";
import { ENGLISH_SECTIONS, OTHER_TEST_SECTIONS, SectionalInputs } from "@/lib/testSections";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const STATUSES: ProfileTestStatus[] = [
  "not_taken",
  "planned",
  "scheduled",
  "result_awaited",
  "taken",
  "expired",
  "waived",
];

function sectionKeysForAttempt(attempt: TestAttempt): string[] {
  if (attempt.category === "english") {
    return ENGLISH_SECTIONS[testIdToLegacyEnglish(attempt.test_id as never)] ?? [];
  }
  if (attempt.category === "aptitude") {
    return OTHER_TEST_SECTIONS[testIdToLegacyAptitude(attempt.test_id as never)] ?? [];
  }
  const exam = attempt.exam_type ?? "";
  return OTHER_TEST_SECTIONS[exam] ?? OTHER_TEST_SECTIONS[exam.toUpperCase()] ?? [];
}

function ScoreChips({ sections }: { sections: Record<string, string> }) {
  const entries = Object.entries(sections).filter(([, v]) => v?.trim());
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map(([label, value]) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs"
        >
          <span className="text-muted-foreground capitalize">{label.replace(/_/g, " ")}</span>
          <span className="font-medium tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}

interface Props {
  attempt: TestAttempt;
  mode: "view" | "edit";
  availableDocuments?: LinkedDocumentOption[];
  onChange?: (patch: Partial<TestAttempt>) => void;
  onLinkDocument?: (documentId: string, slot: string) => void;
  onUnlinkDocument?: (documentId: string, slot: string) => void;
  onUploadDocument?: (file: File, slot: string) => void;
  className?: string;
}

export function TestAttemptForm({
  attempt,
  mode,
  availableDocuments,
  onChange,
  onLinkDocument,
  onUnlinkDocument,
  onUploadDocument,
  className,
}: Props) {
  const vis = visibilityForAttemptStatus(attempt.status, attempt.category);
  const label = testLabel(attempt.test_id);
  const sectionKeys =
    vis.showSectionals && (attempt.category !== "language" || attempt.exam_type)
      ? sectionKeysForAttempt(attempt)
      : [];

  if (mode === "view") {
    return (
      <div className={cn("rounded-lg border p-3 space-y-2", className)} data-testid="attempt-form-view">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          {attempt.variant && (
            <Badge variant="outline" className="text-[10px]">
              {attempt.variant}
            </Badge>
          )}
          {attempt.exam_type && <Badge variant="outline">{attempt.exam_type}</Badge>}
          {attempt.status && <Badge variant="secondary">{statusLabel(attempt.status)}</Badge>}
          {attempt.overall_score && (
            <span className="text-sm">
              Overall <span className="font-semibold tabular-nums">{attempt.overall_score}</span>
            </span>
          )}
        </div>
        {attempt.test_date && (
          <p className="text-xs text-muted-foreground">Test date: {attempt.test_date}</p>
        )}
        {attempt.expiry_date && (
          <p className="text-xs text-muted-foreground">Expiry: {attempt.expiry_date}</p>
        )}
        {vis.showExpiredBanner && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">Result expired — retest required</AlertDescription>
          </Alert>
        )}
        <ScoreChips sections={attempt.sections} />
        {attempt.waiver_reason && (
          <p className="text-xs text-muted-foreground">Waiver: {attempt.waiver_reason}</p>
        )}
        {attempt.notes && <p className="text-xs text-muted-foreground">Notes: {attempt.notes}</p>}
        {attempt.linked_documents.length > 0 && (
          <LinkedDocumentsPanel
            linkedDocuments={attempt.linked_documents}
            scope="tests"
            mode="view"
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-3 space-y-3", className)} data-testid="attempt-form-edit">
      {vis.showExpiredBanner && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">Result expired — retest required</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={attempt.status ?? "not_taken"}
            onValueChange={(v) => onChange?.({ status: v as ProfileTestStatus })}
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showIeltsVariant(attempt.test_id, attempt.status) && (
          <div className="space-y-1">
            <Label>IELTS variant</Label>
            <Select
              value={attempt.variant ?? ""}
              onValueChange={(v) => onChange?.({ variant: (v || null) as IeltsVariant | null })}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="Variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Academic">Academic</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {vis.showExamType && (
          <div className="space-y-1">
            <Label>Exam type</Label>
            <Input
              className="h-8 max-w-xs"
              list={`exam-types-${attempt.test_id}`}
              value={attempt.exam_type ?? ""}
              onChange={(e) => onChange?.({ exam_type: e.target.value || null })}
            />
            <datalist id={`exam-types-${attempt.test_id}`}>
              {(attempt.test_id === "french" ? FRENCH_EXAMS : GERMAN_EXAMS).map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </div>
        )}

        {vis.showCefr && (
          <div className="space-y-1">
            <Label>CEFR level</Label>
            <Input
              className="h-8 w-24"
              value={attempt.cefr_level ?? ""}
              onChange={(e) => onChange?.({ cefr_level: e.target.value || null })}
            />
          </div>
        )}

        {vis.showPlannedMonth && (
          <div className="space-y-1">
            <Label>Planned month</Label>
            <Input
              type="month"
              className="h-8 w-36"
              value={attempt.planned_month ?? ""}
              onChange={(e) => onChange?.({ planned_month: e.target.value || null })}
            />
          </div>
        )}

        {vis.showTargetIntake && (
          <div className="space-y-1">
            <Label>Target intake</Label>
            <Input
              className="h-8 w-36"
              value={attempt.target_intake ?? ""}
              onChange={(e) => onChange?.({ target_intake: e.target.value || null })}
            />
          </div>
        )}

        {vis.showTestDate && (
          <div className="space-y-1">
            <Label>{attempt.status === "planned" ? "Expected test date" : "Test date"}</Label>
            <Input
              type="date"
              className="h-8 w-36"
              value={attempt.test_date ?? ""}
              onChange={(e) => onChange?.({ test_date: e.target.value || null })}
            />
          </div>
        )}

        {vis.showResultDate && (
          <div className="space-y-1">
            <Label>Expected result date</Label>
            <Input
              type="date"
              className="h-8 w-36"
              value={attempt.result_date ?? ""}
              onChange={(e) => onChange?.({ result_date: e.target.value || null })}
            />
          </div>
        )}

        {vis.showOverall && (
          <div className="space-y-1">
            <Label>Overall</Label>
            <Input
              className="h-8 w-24"
              value={attempt.overall_score ?? ""}
              onChange={(e) => onChange?.({ overall_score: e.target.value || null })}
            />
          </div>
        )}

        {vis.showExpiryDate && (
          <div className="space-y-1">
            <Label>Expiry date</Label>
            <Input
              type="date"
              className="h-8 w-36"
              value={attempt.expiry_date ?? ""}
              onChange={(e) => onChange?.({ expiry_date: e.target.value || null })}
            />
          </div>
        )}

        {vis.showCountry && (
          <div className="space-y-1">
            <Label>Country</Label>
            <Input
              className="h-8 w-36"
              value={attempt.country ?? ""}
              onChange={(e) => onChange?.({ country: e.target.value || null })}
            />
          </div>
        )}

        {vis.showExamCentre && (
          <div className="space-y-1">
            <Label>Exam centre</Label>
            <Input
              className="h-8 max-w-xs"
              value={attempt.exam_centre ?? ""}
              onChange={(e) => onChange?.({ exam_centre: e.target.value || null })}
            />
          </div>
        )}
      </div>

      {sectionKeys.length > 0 && (
        <SectionalInputs
          sections={sectionKeys}
          values={attempt.sections}
          onChange={(next) => onChange?.({ sections: next })}
        />
      )}

      {vis.showWaiverReason && (
        <div className="space-y-1">
          <Label>Waiver reason</Label>
          <Input
            className="h-8 max-w-md"
            placeholder="e.g. English medium education"
            value={attempt.waiver_reason ?? ""}
            onChange={(e) => onChange?.({ waiver_reason: e.target.value || null })}
          />
        </div>
      )}

      {vis.showNotes && (
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea
            className="min-h-[60px] text-sm"
            value={attempt.notes ?? ""}
            onChange={(e) => onChange?.({ notes: e.target.value || null })}
          />
        </div>
      )}

      {vis.showDocuments && (
        <LinkedDocumentsPanel
          linkedDocuments={attempt.linked_documents}
          scope="tests"
          mode="edit"
          availableDocuments={availableDocuments}
          onLinkExisting={onLinkDocument}
          onUnlink={onUnlinkDocument}
          onUpload={onUploadDocument}
        />
      )}
    </div>
  );
}
