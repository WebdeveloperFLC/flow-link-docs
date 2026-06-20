import { useMemo, useEffect, useCallback } from "react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, AlertTriangle, Trash2, Save } from "lucide-react";
import { DynamicFieldGroup } from "./DynamicFieldGroup";
import { useAgreements, useRenewalCountdown, renewalThreshold } from "../hooks/useInstitutionData";
import { ALLOW_TEST_DELETIONS } from "../config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function CountdownChip({ validTo }: { validTo?: string | null }) {
  const days = useRenewalCountdown(validTo);
  const threshold = renewalThreshold(days);
  if (days == null) return <Badge variant="secondary">No expiry</Badge>;
  if (days < 0) return <Badge variant="destructive">Expired {Math.abs(days)}d ago</Badge>;
  const tone = threshold && threshold <= 60 ? "destructive" : threshold && threshold <= 120 ? "default" : "secondary";
  return <Badge variant={tone as any}>{days}d to renewal</Badge>;
}

export function AgreementsPanel({ institutionId }: { institutionId: string }) {
  const { data: agreements, loading, reload } = useAgreements(institutionId) as any;
  const [view, setView] = useState<any | null>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const [versions, setVersions] = useState<any | null>(null);

  const deleteAgreement = async (a: any) => {
    if (!confirm(`Delete agreement "${a.title}"?\n\nThis is irreversible.`)) return;
    const { error } = await supabase.from("upi_agreements").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Agreement deleted");
    reload?.();
  };

  const sorted = useMemo(
    () => [...agreements].sort((a: any, b: any) => (a.valid_to ?? "").localeCompare(b.valid_to ?? "")),
    [agreements],
  );

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading agreements…</div>;
  if (sorted.length === 0)
    return <div className="text-sm text-muted-foreground py-8 text-center">No agreements yet. Upload an Agreement document to auto-create one.</div>;

  return (
    <div className="space-y-3">
      {sorted.map((a: any) => {
        const ext = a.extracted_data ?? {};
        const countries = Array.isArray(ext.countries_allowed) ? ext.countries_allowed.join(", ") : "—";
        const validation = ext.validation as
          | { missing_fields?: string[]; low_confidence_fields?: string[]; notes?: string[]; needs_review?: boolean }
          | undefined;
        return (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{a.title}</span>
                  <Badge variant="outline">{a.agreement_type}</Badge>
                  <Badge>{a.status}</Badge>
                  <CountdownChip validTo={a.valid_to} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.valid_from ?? "?"} → {a.valid_to ?? "?"} · Countries: {countries}
                </div>
                {ext.ai_summary && (
                  <div className="text-sm mt-2 bg-muted/40 rounded p-2 border border-border/50">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">AI summary</span>
                    {ext.ai_summary}
                  </div>
                )}
                {validation?.needs_review && (
                  <div className="text-sm mt-2 rounded p-2 border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="size-4" /> Extraction needs review
                    </div>
                    {(validation.missing_fields?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-xs uppercase tracking-wider opacity-70 mr-1">Missing</span>
                        {validation.missing_fields!.map((f) => (
                          <Badge key={f} variant="outline" className="border-amber-400 text-amber-900 dark:text-amber-200">{f}</Badge>
                        ))}
                      </div>
                    )}
                    {(validation.low_confidence_fields?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-xs uppercase tracking-wider opacity-70 mr-1">Low confidence</span>
                        {validation.low_confidence_fields!.map((f) => (
                          <Badge key={f} variant="outline" className="border-amber-400 text-amber-900 dark:text-amber-200">{f}</Badge>
                        ))}
                      </div>
                    )}
                    {(validation.notes?.length ?? 0) > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-xs">
                        {validation.notes!.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    )}
                    <div className="mt-1 text-xs opacity-80">Use "Edit dynamic fields" to fill the missing items.</div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                  {ext.governing_law && <Item label="Governing law" value={ext.governing_law} />}
                  {ext.claim_deadline_days != null && <Item label="Claim deadline" value={`${ext.claim_deadline_days}d`} />}
                  {ext.invoice_deadline_days != null && <Item label="Invoice deadline" value={`${ext.invoice_deadline_days}d`} />}
                  {ext.termination_notice_days != null && <Item label="Termination notice" value={`${ext.termination_notice_days}d`} />}
                  {ext.sub_agent_allowed != null && <Item label="Sub-agent" value={ext.sub_agent_allowed ? "Allowed" : "No"} />}
                  {ext.b2b_allowed != null && <Item label="B2B" value={ext.b2b_allowed ? "Allowed" : "No"} />}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setView(a)}>View details</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEdit(a)}>Edit dynamic fields</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView({ ...a, _focus: "ai" })}>Extract AI summary</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView({ ...a, _focus: "renewal" })}>Renewal review</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setVersions(a)}>Version history</DropdownMenuItem>
                  {ALLOW_TEST_DELETIONS && (
                    <DropdownMenuItem onClick={() => deleteAgreement(a)} className="text-destructive focus:text-destructive">
                      <Trash2 className="size-4 mr-2" /> Delete agreement
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        );
      })}

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{view?.title}</DialogTitle></DialogHeader>
          {view && <DynamicFieldGroup scope="agreement" values={view.extracted_data ?? {}} readOnly />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit — {edit?.title}</DialogTitle></DialogHeader>
          {edit && (
            <DynamicFieldGroup
              scope="agreement"
              values={edit.extracted_data ?? {}}
              onChange={(v) => setEdit({ ...edit, extracted_data: v })}
            />
          )}
        </DialogContent>
      </Dialog>

      <AgreementVersionsDialog agreement={versions} onClose={() => setVersions(null)} />
    </div>
  );
}

type AgreementVersionRow = {
  id: string;
  version_number: number;
  change_summary: string | null;
  effective_from: string | null;
  effective_to: string | null;
  status: string | null;
  created_at: string | null;
};

function AgreementVersionsDialog({ agreement, onClose }: { agreement: any | null; onClose: () => void }) {
  const [rows, setRows] = useState<AgreementVersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agreement?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("upi_agreement_versions")
      .select("id, version_number, change_summary, effective_from, effective_to, status, created_at")
      .eq("agreement_id", agreement.id)
      .order("version_number", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as AgreementVersionRow[]);
    setLoading(false);
  }, [agreement?.id]);

  useEffect(() => {
    if (agreement) load();
    else setRows([]);
  }, [agreement, load]);

  const updateRow = (id: string, patch: Partial<AgreementVersionRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveRow = async (row: AgreementVersionRow) => {
    setSavingId(row.id);
    const { error } = await supabase.from("upi_agreement_versions").update({
      effective_from: row.effective_from || null,
      effective_to: row.effective_to || null,
      status: row.status || "draft",
      change_summary: row.change_summary,
    }).eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(`Version ${row.version_number} saved`);
    setSavingId(null);
  };

  return (
    <Dialog open={!!agreement} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agreement versions — {agreement?.title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Effective dates drive commission agreement_version_id resolution and eligibility config versioning.
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading versions…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No version rows yet. Upload a new agreement document to create v1.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">v{row.version_number}</div>
                  <Badge variant={row.status === "published" ? "default" : "secondary"}>{row.status ?? "draft"}</Badge>
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Effective from</Label>
                    <Input
                      type="date"
                      value={row.effective_from ?? ""}
                      onChange={(e) => updateRow(row.id, { effective_from: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Effective to</Label>
                    <Input
                      type="date"
                      value={row.effective_to ?? ""}
                      onChange={(e) => updateRow(row.id, { effective_to: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={row.status ?? "draft"} onValueChange={(v) => updateRow(row.id, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="superseded">Superseded</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Change summary</Label>
                  <Input
                    value={row.change_summary ?? ""}
                    onChange={(e) => updateRow(row.id, { change_summary: e.target.value })}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Created {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}</span>
                  <Button size="sm" variant="outline" disabled={savingId === row.id} onClick={() => saveRow(row)}>
                    <Save className="size-3.5 mr-1" /> Save
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}