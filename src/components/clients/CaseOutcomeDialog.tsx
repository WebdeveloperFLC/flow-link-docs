import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { buildServiceCode } from "@/lib/service-library/serviceCodes";
import type { ClientServiceCase } from "@/lib/clientServiceCase";
import { closeCaseWithOutcome, uploadOutcomeDocument } from "@/lib/caseOutcome";
import {
  buildDefaultTransfer,
  executeReapplication,
  listTransferableDocuments,
  type ReapplyTransferOptions,
} from "@/lib/caseReapplication";

type OutcomeChoice = "approved" | "refused" | "reapply" | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  serviceCase: ClientServiceCase | null;
  serviceLabel?: string | null;
  onComplete: () => void;
};

export function CaseOutcomeDialog({
  open,
  onOpenChange,
  clientId,
  serviceCase,
  serviceLabel,
  onComplete,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [choice, setChoice] = useState<OutcomeChoice>(null);
  const [busy, setBusy] = useState(false);
  const [approvalFile, setApprovalFile] = useState<File | null>(null);
  const [refusalFile, setRefusalFile] = useState<File | null>(null);
  const [refusalDeferred, setRefusalDeferred] = useState(false);
  const [originalOutcome, setOriginalOutcome] = useState<"refused" | "withdrawn" | "open">("refused");
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [targetServiceId, setTargetServiceId] = useState<string>("");
  const [transferDocs, setTransferDocs] = useState<Array<{ id: string; label: string; documentType: string }>>([]);
  const [transfer, setTransfer] = useState<ReapplyTransferOptions | null>(null);

  useEffect(() => {
    if (!open) {
      setChoice(null);
      setApprovalFile(null);
      setRefusalFile(null);
      setRefusalDeferred(false);
      setOriginalOutcome("refused");
      setTargetServiceId("");
      setTransfer(null);
      return;
    }
    void fetchAllServiceCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
    void listTransferableDocuments(clientId).then(setTransferDocs);
  }, [open, clientId]);

  const targetItem = useMemo(
    () => catalogue.find((c) => c.id === targetServiceId) ?? null,
    [catalogue, targetServiceId],
  );

  const sameServiceReapply = useMemo(() => {
    if (!serviceCase || !targetItem) return false;
    const code = buildServiceCode(targetItem.library_id ?? targetItem.id, targetItem.country_tag);
    return code.toLowerCase() === serviceCase.serviceCode.toLowerCase();
  }, [serviceCase, targetItem]);

  useEffect(() => {
    if (choice !== "reapply" || !serviceCase || !targetItem) return;
    const code = buildServiceCode(targetItem.library_id ?? targetItem.id, targetItem.country_tag);
    const same = code.toLowerCase() === serviceCase.serviceCode.toLowerCase();
    const base = buildDefaultTransfer(serviceCase.serviceCode, code);
    if (!same && transferDocs.length) {
      const passportIds = transferDocs
        .filter((d) => /passport/i.test(d.documentType) || /passport/i.test(d.label))
        .map((d) => d.id);
      setTransfer({ ...base, documents: passportIds });
    } else {
      setTransfer(base);
    }
  }, [choice, serviceCase, targetItem, transferDocs]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const c of catalogue) {
      if (c.country_tag?.trim()) set.add(c.country_tag.trim());
    }
    return [...set].sort();
  }, [catalogue]);

  const [targetCountry, setTargetCountry] = useState<string>("");
  const servicesInCountry = useMemo(
    () => catalogue.filter((c) => (c.country_tag ?? "").trim() === targetCountry),
    [catalogue, targetCountry],
  );

  useEffect(() => {
    if (open && serviceCase && !targetCountry) {
      const parts = serviceCase.serviceCode.split("::");
      setTargetCountry(parts[1]?.trim() ?? countries[0] ?? "");
    }
  }, [open, serviceCase, targetCountry, countries]);

  const confirmApproved = async () => {
    if (!serviceCase || !approvalFile) return;
    setBusy(true);
    try {
      const docId = await uploadOutcomeDocument({
        clientId,
        caseId: serviceCase.id,
        file: approvalFile,
        documentType: "Visa",
        customType: "Visa approval / grant letter",
      });
      await closeCaseWithOutcome({
        caseId: serviceCase.id,
        clientId,
        outcome: "approved",
        actorId: user?.id ?? null,
        documentId: docId,
      });
      toast.success("Case closed — approved");
      onOpenChange(false);
      onComplete();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to close case");
    } finally {
      setBusy(false);
    }
  };

  const confirmRefused = async () => {
    if (!serviceCase) return;
    setBusy(true);
    try {
      let docId: string | null = null;
      if (refusalFile) {
        docId = await uploadOutcomeDocument({
          clientId,
          caseId: serviceCase.id,
          file: refusalFile,
          documentType: "Other",
          customType: "Visa refusal letter",
        });
      }
      await closeCaseWithOutcome({
        caseId: serviceCase.id,
        clientId,
        outcome: "refused",
        actorId: user?.id ?? null,
        documentId: docId,
        refusalDocPending: !docId && refusalDeferred,
        note: !docId && refusalDeferred ? "Refusal letter to follow" : null,
      });
      toast.success(docId ? "Case closed — refused" : "Case closed — refusal letter pending");
      onOpenChange(false);
      onComplete();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to close case");
    } finally {
      setBusy(false);
    }
  };

  const confirmReapply = async () => {
    if (!serviceCase || !targetItem || !transfer) return;
    setBusy(true);
    try {
      const libraryId = targetItem.library_id ?? targetItem.id;
      const country = targetItem.country_tag ?? targetCountry;
      const serviceCode = buildServiceCode(libraryId, country);
      const { newCaseId, serviceCode: code } = await executeReapplication({
        sourceCase: serviceCase,
        clientId,
        targetServiceCode: serviceCode,
        targetLibraryId: libraryId,
        targetCountry: country,
        targetServiceTitle: targetItem.service_name ?? targetItem.sub_category ?? "Application",
        targetSubService: targetItem.sub_category ?? targetItem.service_name ?? "",
        targetCategory: targetItem.master_key ?? "visa_immigration",
        originalOutcome,
        actorId: user?.id ?? null,
        transfer,
        catalogue,
      });
      toast.success("Reapplication case created");
      onOpenChange(false);
      onComplete();
      navigate(`/clients/${clientId}?service=${encodeURIComponent(code)}&case=${newCaseId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create reapplication");
    } finally {
      setBusy(false);
    }
  };

  const title = serviceLabel ?? serviceCase?.serviceCode ?? "Case";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Case outcome — {title}</DialogTitle>
        </DialogHeader>

        {!choice && (
          <div className="grid gap-2 py-2">
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setChoice("approved")}>
              <CheckCircle2 className="size-4 mr-2 text-emerald-600 shrink-0" />
              <span className="text-left">
                <span className="font-medium block">Approved</span>
                <span className="text-xs text-muted-foreground">Upload visa / approval letter (required)</span>
              </span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setChoice("refused")}>
              <XCircle className="size-4 mr-2 text-red-600 shrink-0" />
              <span className="text-left">
                <span className="font-medium block">Refused</span>
                <span className="text-xs text-muted-foreground">Letter optional — can mark document to follow</span>
              </span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setChoice("reapply")}>
              <RotateCcw className="size-4 mr-2 text-primary shrink-0" />
              <span className="text-left">
                <span className="font-medium block">Reapply</span>
                <span className="text-xs text-muted-foreground">New attempt — any country/service, no documents required</span>
              </span>
            </Button>
          </div>
        )}

        {choice === "approved" && (
          <div className="space-y-3 py-2">
            <Label>Visa copy / approval letter (required)</Label>
            <label className="flex flex-col items-center gap-2 border border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/40">
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {approvalFile ? approvalFile.name : "Choose file"}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setApprovalFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChoice(null)} disabled={busy}>Back</Button>
              <Button onClick={() => void confirmApproved()} disabled={busy || !approvalFile}>
                {busy && <Loader2 className="size-4 mr-1 animate-spin" />}
                Confirm approved
              </Button>
            </DialogFooter>
          </div>
        )}

        {choice === "refused" && (
          <div className="space-y-3 py-2">
            <Label>Refusal letter (optional)</Label>
            <label className="flex flex-col items-center gap-2 border border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40">
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {refusalFile ? refusalFile.name : "Upload now (optional)"}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  setRefusalFile(e.target.files?.[0] ?? null);
                  setRefusalDeferred(false);
                }}
              />
            </label>
            {!refusalFile && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setRefusalDeferred(true)}
              >
                Mark refused — document to follow
              </Button>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setChoice(null)} disabled={busy}>Back</Button>
              <Button
                onClick={() => void confirmRefused()}
                disabled={busy || (!refusalFile && !refusalDeferred)}
              >
                {busy && <Loader2 className="size-4 mr-1 animate-spin" />}
                Confirm refused
              </Button>
            </DialogFooter>
          </div>
        )}

        {choice === "reapply" && transfer && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Close original case as</Label>
              <Select
                value={originalOutcome}
                onValueChange={(v) => setOriginalOutcome(v as typeof originalOutcome)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="refused">Refused (default)</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="open">Leave open (freeze only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Country</Label>
                <Select value={targetCountry} onValueChange={setTargetCountry}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Service</Label>
                <Select value={targetServiceId} onValueChange={setTargetServiceId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent>
                    {servicesInCountry.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.service_name ?? s.sub_category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!sameServiceReapply && targetItem && (
              <div className="rounded-md border p-3 space-y-2 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Choose what to transfer</p>
                {(
                  [
                    ["profile", "Applicant profile"],
                    ["family", "Family members"],
                    ["tests", "Tests & scores"],
                    ["programmes", "Programmes"],
                    ["forms", "Forms & letters / SOP"],
                    ["refusalLetter", "Refusal letter from prior case"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <Checkbox
                      checked={transfer[key]}
                      onCheckedChange={(v) =>
                        setTransfer((t) => (t ? { ...t, [key]: v === true } : t))
                      }
                    />
                    {label}
                  </label>
                ))}
                <p className="text-xs text-muted-foreground pt-1">Documents (pick individually)</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {transferDocs.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={transfer.documents.includes(d.id)}
                        onCheckedChange={(v) =>
                          setTransfer((t) => {
                            if (!t) return t;
                            const docs = v
                              ? [...t.documents, d.id]
                              : t.documents.filter((id) => id !== d.id);
                            return { ...t, documents: docs };
                          })
                        }
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {sameServiceReapply && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted/40 p-2">
                Same country and service — full file will carry over automatically (documents, profile, family, tests, programmes, forms).
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setChoice(null)} disabled={busy}>Back</Button>
              <Button onClick={() => void confirmReapply()} disabled={busy || !targetServiceId}>
                {busy && <Loader2 className="size-4 mr-1 animate-spin" />}
                Create reapplication
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
