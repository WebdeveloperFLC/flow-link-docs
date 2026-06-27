import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { UpiCourseStaging } from "@/institutions/types/upi";
import {
  compareSmartImportRecords,
  formatCompareCounts,
  mapSmartProgramRecords,
  parseDelimitedText,
  parseSmartImportFile,
  type ProgramCompareSummary,
  type SmartImportMethod,
  type SmartProgramRecord,
} from "@/institutions/lib/smartProgramImport";

type WizardStep = "method" | "preview" | "compare" | "import";

const METHODS: Array<{
  id: SmartImportMethod;
  label: string;
  description: string;
  icon: typeof ClipboardPaste;
  primary?: boolean;
}> = [
  {
    id: "paste",
    label: "Paste from Clipboard",
    description: "Copy a table from an institution website and paste it here.",
    icon: ClipboardPaste,
    primary: true,
  },
  {
    id: "xlsx",
    label: "Excel (.xlsx)",
    description: "Upload a spreadsheet with program rows.",
    icon: FileSpreadsheet,
  },
  {
    id: "csv",
    label: "CSV",
    description: "Comma-separated program list.",
    icon: FileText,
  },
  {
    id: "tsv",
    label: "TSV",
    description: "Tab-separated program list.",
    icon: FileText,
  },
];

export function SmartProgramImportWizard({
  institutionId,
  institutionName,
  existingPrograms,
  programLevels,
  canEdit,
  onImported,
}: {
  institutionId: string;
  institutionName: string;
  existingPrograms: UpiCourseStaging[];
  programLevels: { id: string; name: string }[];
  canEdit: boolean;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("method");
  const [method, setMethod] = useState<SmartImportMethod>("paste");
  const [pasteText, setPasteText] = useState("");
  const [records, setRecords] = useState<SmartProgramRecord[]>([]);
  const [compareSummary, setCompareSummary] = useState<ProgramCompareSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const levelNameById = useMemo(() => new Map(programLevels.map((l) => [l.id, l.name])), [programLevels]);
  const resolveLevelName = (id: string | null | undefined) => levelNameById.get(String(id ?? "")) ?? null;

  const counts = compareSummary ? formatCompareCounts(compareSummary) : null;

  const reset = () => {
    setStep("method");
    setMethod("paste");
    setPasteText("");
    setRecords([]);
    setCompareSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const parseInput = async (): Promise<SmartProgramRecord[]> => {
    if (method === "paste") {
      const text = pasteText.trim();
      if (!text) throw new Error("Paste a table copied from the institution website");
      const rows = parseDelimitedText(text);
      if (!rows.length) throw new Error("Could not detect rows — include a header row and at least one program");
      return mapSmartProgramRecords(rows);
    }
    const file = fileRef.current?.files?.[0];
    if (!file) throw new Error("Choose a file to import");
    if (file.size > 15 * 1024 * 1024) throw new Error("File too large (max 15MB)");
    const buffer = await file.arrayBuffer();
    const rows = parseSmartImportFile(buffer, method);
    if (!rows.length) throw new Error("No program rows found — check headers and data");
    return mapSmartProgramRecords(rows);
  };

  const goPreview = async () => {
    setBusy(true);
    try {
      const parsed = await parseInput();
      if (!parsed.length) {
        toast.error("No programs detected — check Program Name column");
        return;
      }
      setRecords(parsed);
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  };

  const goCompare = async () => {
    setBusy(true);
    try {
      const summary = await compareSmartImportRecords(
        records,
        institutionId,
        existingPrograms,
        resolveLevelName,
      );
      setCompareSummary(summary);
      setStep("compare");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!compareSummary) return;
    const toImport = [...compareSummary.new, ...compareSummary.updated].map((item) => item.payload);
    if (!toImport.length) {
      toast.info("Nothing to import — all rows unchanged or have errors");
      return;
    }
    setBusy(true);
    setStep("import");
    const t = toast.loading(`Importing ${toImport.length} program${toImport.length === 1 ? "" : "s"}…`);
    try {
      const { data, error } = await supabase.functions.invoke("upi-upsert-courses", {
        body: { courses: toImport, institution_id: institutionId },
      });
      if (error) throw new Error(error.message);
      const upserted = (data as { upserted?: number })?.upserted ?? 0;
      const rejected = (data as { rejected?: number })?.rejected ?? 0;
      toast.dismiss(t);
      if (upserted > 0) {
        toast.success(`Imported ${upserted} program${upserted === 1 ? "" : "s"} to ${institutionName}`);
      }
      if (rejected > 0) {
        toast.warning(`${rejected} row${rejected === 1 ? "" : "s"} rejected`);
      }
      setOpen(false);
      reset();
      onImported();
    } catch (e) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "Import failed");
      setStep("compare");
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Upload className="size-4 mr-1" /> Import Programs
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Smart Program Import</DialogTitle>
            <DialogDescription>
              Structured master data for <strong>{institutionName}</strong> — no AI, no sync, no knowledge sources.
              Paste a program table or upload a file.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(["method", "preview", "compare", "import"] as WizardStep[]).map((s, idx) => {
              const labels = ["Method", "Preview", "Compare", "Import"];
              const active = step === s;
              const done =
                (s === "method" && step !== "method") ||
                (s === "preview" && (step === "compare" || step === "import")) ||
                (s === "compare" && step === "import");
              return (
                <div key={s} className="flex items-center gap-2">
                  {idx > 0 ? <span className="text-border">→</span> : null}
                  <Badge variant={active ? "default" : done ? "secondary" : "outline"}>{labels[idx]}</Badge>
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-1">
            {step === "method" && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-2">
                  {METHODS.map((m) => {
                    const Icon = m.icon;
                    const selected = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Icon className="size-4 shrink-0" />
                          {m.label}
                          {m.primary ? <Badge className="text-[10px] ml-auto">Primary</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                      </button>
                    );
                  })}
                </div>

                {method === "paste" ? (
                  <div className="space-y-2">
                    <Textarea
                      className="min-h-[220px] font-mono text-xs"
                      placeholder={`Paste tab-separated rows from the institution website…\n\nProgram Name\tCredential\tIntakes\tProgram URL\nComputer Programming (CPP)\tDiploma\tSep, Jan\thttps://…`}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tab-separated rows are detected automatically. Include a header row.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept={
                        method === "xlsx"
                          ? ".xlsx,.xls"
                          : method === "csv"
                            ? ".csv"
                            : ".tsv,.txt"
                      }
                      className="block w-full text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {method === "xlsx"
                        ? "First worksheet is used. Partner program sheets are supported."
                        : `Upload a ${method.toUpperCase()} file with Program Name, Credential, Intakes, and optional URL columns.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {records.length} program{records.length === 1 ? "" : "s"} parsed for {institutionName}.
                  Columns auto-detected: Program Name, Program Code, Credential, Intakes, URL.
                </p>
                <div className="rounded-md border overflow-auto max-h-[360px]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">#</th>
                        <th className="text-left p-2 font-medium">Program Name</th>
                        <th className="text-left p-2 font-medium">Code</th>
                        <th className="text-left p-2 font-medium">Credential</th>
                        <th className="text-left p-2 font-medium">Intakes</th>
                        <th className="text-left p-2 font-medium">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.rowIndex} className="border-t">
                          <td className="p-2 text-muted-foreground">{r.rowIndex}</td>
                          <td className="p-2">{r.programName}</td>
                          <td className="p-2">{r.programCode ?? "—"}</td>
                          <td className="p-2">{r.credential ?? "—"}</td>
                          <td className="p-2">{r.intakes.length ? r.intakes.join(", ") : "—"}</td>
                          <td className="p-2 max-w-[140px] truncate">{r.programUrl ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {step === "compare" && compareSummary && counts && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <CardStat label="New Programs" value={counts.new} tone="primary" />
                  <CardStat label="Updated Programs" value={counts.updated} tone="warn" />
                  <CardStat label="Unchanged" value={counts.unchanged} tone="muted" />
                  <CardStat label="Errors" value={counts.errors} tone="destructive" />
                </div>
                <CompareList title="New Programs" items={compareSummary.new} />
                <CompareList title="Updated Programs" items={compareSummary.updated} showChanges />
                {compareSummary.errors.length > 0 ? (
                  <CompareList title="Errors" items={compareSummary.errors} isError />
                ) : null}
                {counts.new + counts.updated === 0 ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Nothing new to import — adjust your data or update existing programs manually.
                  </p>
                ) : null}
              </div>
            )}

            {step === "import" && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <CheckCircle2 className="size-10 text-primary animate-pulse" />
                <p className="font-medium">Importing programs…</p>
                <p className="text-sm text-muted-foreground">Writing structured master data — no AI extraction.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {step === "method" && (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={goPreview} disabled={busy}>
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </>
            )}
            {step === "preview" && (
              <>
                <Button variant="outline" onClick={() => setStep("method")} disabled={busy}>
                  <ChevronLeft className="size-4 mr-1" /> Back
                </Button>
                <Button onClick={goCompare} disabled={busy || !records.length}>
                  Compare <ChevronRight className="size-4 ml-1" />
                </Button>
              </>
            )}
            {step === "compare" && (
              <>
                <Button variant="outline" onClick={() => setStep("preview")} disabled={busy}>
                  <ChevronLeft className="size-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={runImport}
                  disabled={busy || !compareSummary || counts!.new + counts!.updated === 0}
                >
                  <Upload className="size-4 mr-1" />
                  Import {counts ? counts.new + counts.updated : 0} program
                  {counts && counts.new + counts.updated === 1 ? "" : "s"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "warn" | "muted" | "destructive";
}) {
  const cls =
    tone === "primary"
      ? "border-primary/30 bg-primary/5"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5"
        : tone === "destructive"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted/20";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function CompareList({
  title,
  items,
  showChanges,
  isError,
}: {
  title: string;
  items: ProgramCompareSummary[keyof ProgramCompareSummary];
  showChanges?: boolean;
  isError?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="rounded-md border max-h-40 overflow-y-auto divide-y text-xs">
        {items.slice(0, 50).map((item, idx) => (
          <div key={idx} className="p-2 flex justify-between gap-2">
            <span className="truncate">{item.record.programName}</span>
            {isError && item.kind === "error" ? (
              <span className="text-destructive shrink-0">{item.error}</span>
            ) : showChanges && item.kind === "updated" ? (
              <span className="text-muted-foreground shrink-0">{item.changes.join(", ")}</span>
            ) : null}
          </div>
        ))}
        {items.length > 50 ? (
          <div className="p-2 text-muted-foreground">+ {items.length - 50} more</div>
        ) : null}
      </div>
    </div>
  );
}

/** Shown when Program Workspace has no institution filter — import requires a selected institution. */
export function SmartProgramImportWizardGate({
  institutionId,
  institutionName,
  existingPrograms,
  programLevels,
  canEdit,
  onImported,
}: {
  institutionId: string | null;
  institutionName: string | null;
  existingPrograms: UpiCourseStaging[];
  programLevels: { id: string; name: string }[];
  canEdit: boolean;
  onImported: () => void;
}) {
  if (!canEdit) return null;
  if (!institutionId || institutionId === "all" || !institutionName) {
    return (
      <Button size="sm" variant="outline" disabled title="Select an institution first">
        <Upload className="size-4 mr-1" /> Import Programs
      </Button>
    );
  }
  return (
    <SmartProgramImportWizard
      institutionId={institutionId}
      institutionName={institutionName}
      existingPrograms={existingPrograms}
      programLevels={programLevels}
      canEdit={canEdit}
      onImported={onImported}
    />
  );
}
