import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Building2, ExternalLink, ChevronDown, UserCircle } from "lucide-react";
import { useClientQualification } from "@/hooks/useClientQualification";
import { QualificationLifecycleBadge } from "./QualificationLifecycleBadge";
import { QualificationCreateDialog } from "./QualificationCreateDialog";
import { QualificationTransitionDialog } from "./QualificationTransitionDialog";
import {
  availableQualificationTransitions,
  isQualificationEditable,
} from "@/lib/qualification/lifecycle";
import {
  APPLICATION_STATUS_LABELS,
  FUNDING_SOURCE_OPTIONS,
  QUALIFICATION_STATUS_LABELS,
} from "@/lib/qualification/constants";
import {
  reassignQualificationOwner,
  updateApplicationStatus,
  upsertQualificationFundingPlan,
} from "@/lib/qualification/qualificationApi";
import type { InstitutionApplicationStatus, QualificationLifecycleStatus } from "@/lib/qualification/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  clientId: string;
  caseId: string | undefined;
  canEdit: boolean;
  refreshKey?: number;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function QualificationTabContent({ clientId, caseId, canEdit, refreshKey = 0 }: Props) {
  const {
    qualifications,
    selected,
    selectedId,
    setSelectedId,
    depositTrack,
    tuitionTrack,
    fundingPlan,
    events,
    loading,
    detailLoading,
    reload,
  } = useClientQualification(clientId, caseId, refreshKey);

  const [createOpen, setCreateOpen] = useState(false);
  const [transitionTo, setTransitionTo] = useState<QualificationLifecycleStatus | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<{ id: string; name: string }[]>([]);
  const [depositSources, setDepositSources] = useState<string[]>([]);
  const [tuitionSources, setTuitionSources] = useState<string[]>([]);
  const [fundingNotes, setFundingNotes] = useState("");
  const [savingFunding, setSavingFunding] = useState(false);

  const transitions = useMemo(
    () => (selected ? availableQualificationTransitions(selected.status) : []),
    [selected],
  );

  useEffect(() => {
    if (!selected?.ownerUserId) {
      setOwnerName(null);
      return;
    }
    void supabase
      .from("profiles")
      .select("full_name")
      .eq("id", selected.ownerUserId)
      .maybeSingle()
      .then(({ data }) => setOwnerName((data as { full_name?: string } | null)?.full_name ?? null));
  }, [selected?.ownerUserId]);

  useEffect(() => {
    if (!canEdit) return;
    void supabase
      .from("profiles")
      .select("id, full_name")
      .not("full_name", "is", null)
      .order("full_name")
      .limit(200)
      .then(({ data }) =>
        setOwnerOptions(
          ((data ?? []) as { id: string; full_name: string }[]).map((p) => ({
            id: p.id,
            name: p.full_name,
          })),
        ),
      );
  }, [canEdit]);

  useEffect(() => {
    setDepositSources(fundingPlan?.depositSources ?? []);
    setTuitionSources(fundingPlan?.tuitionSources ?? []);
    setFundingNotes(fundingPlan?.notes ?? "");
  }, [fundingPlan]);

  if (!caseId) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Select a service case to manage institution qualification.
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading qualification…
      </Card>
    );
  }

  const handleApplicationStatus = async (value: InstitutionApplicationStatus) => {
    if (!selected) return;
    try {
      await updateApplicationStatus(selected.id, value);
      toast.success("Application status updated");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleOwnerChange = async (userId: string) => {
    if (!selected) return;
    try {
      await reassignQualificationOwner(selected.id, userId);
      toast.success("Owner updated");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reassign failed");
    }
  };

  const handleSaveFunding = async () => {
    if (!selected) return;
    setSavingFunding(true);
    try {
      await upsertQualificationFundingPlan(
        selected.id,
        depositSources,
        tuitionSources,
        fundingNotes.trim() || undefined,
      );
      toast.success("Funding plan saved");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingFunding(false);
    }
  };

  const toggleSource = (list: string[], value: string, checked: boolean) => {
    if (checked) return [...list, value];
    return list.filter((v) => v !== value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            Institution qualification
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Operational deposit and tuition tracking to the institution — not FLC accounting.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" />
            New qualification
          </Button>
        )}
      </div>

      {qualifications.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No qualification record for this service case yet.
          {canEdit && (
            <div className="mt-4">
              <Button onClick={() => setCreateOpen(true)}>Create qualification</Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {qualifications.length > 1 && (
            <div className="space-y-2 max-w-md">
              <Label>Qualification record</Label>
              <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select qualification" />
                </SelectTrigger>
                <SelectContent>
                  {qualifications.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.institutionName ?? "Institution"} — {q.intakeTerm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selected && (
            <>
              <Card className="p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium text-base">{selected.institutionName ?? "Institution"}</div>
                    <div className="text-sm text-muted-foreground">
                      {selected.programName || "Program TBD"} · Intake {selected.intakeTerm}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserCircle className="size-3.5" />
                      Owner: {ownerName ?? "Unassigned"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <QualificationLifecycleBadge
                      status={selected.status}
                      holdReasonCode={selected.holdReasonCode}
                    />
                    {canEdit && isQualificationEditable(selected.status) && transitions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Change status
                            <ChevronDown className="size-3.5 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {transitions.map((t) => (
                            <DropdownMenuItem key={t} onClick={() => setTransitionTo(t)}>
                              {QUALIFICATION_STATUS_LABELS[t]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Application status</Label>
                    <Select
                      value={selected.applicationStatus ?? "APPLIED"}
                      onValueChange={(v) => void handleApplicationStatus(v as InstitutionApplicationStatus)}
                      disabled={!canEdit || !isQualificationEditable(selected.status)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Admissions stage only — does not affect commission, payments, or lifecycle.
                    </p>
                  </div>

                  {canEdit && isQualificationEditable(selected.status) && (
                    <div className="space-y-2">
                      <Label>Reassign owner</Label>
                      <Select
                        value={selected.ownerUserId ?? ""}
                        onValueChange={(v) => void handleOwnerChange(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {ownerOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <div>
                  <div className="font-medium">Deposit & tuition summary</div>
                  <p className="text-xs text-muted-foreground">
                    Amounts owed to the institution — not FLC receivables or trust balances.
                  </p>
                </div>
                {detailLoading ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading tracks…
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="text-sm font-medium">Deposit (institution)</div>
                      {depositTrack ? (
                        <>
                          <div className="text-xs text-muted-foreground">
                            Required: {formatMoney(depositTrack.requiredAmount, depositTrack.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Paid: {formatMoney(depositTrack.paidAmount, depositTrack.currency)}
                          </div>
                          <div className="text-sm font-medium">
                            Outstanding:{" "}
                            {formatMoney(depositTrack.outstandingAmount, depositTrack.currency)}
                          </div>
                          <Badge variant="outline">{depositTrack.status.replace("_", " ")}</Badge>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No deposit track</div>
                      )}
                    </div>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="text-sm font-medium">Tuition (institution)</div>
                      {tuitionTrack ? (
                        <>
                          <div className="text-xs text-muted-foreground">
                            Total: {formatMoney(tuitionTrack.totalTuition, tuitionTrack.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Paid: {formatMoney(tuitionTrack.paidAmount, tuitionTrack.currency)}
                          </div>
                          <div className="text-sm font-medium">
                            Outstanding:{" "}
                            {formatMoney(tuitionTrack.outstandingAmount, tuitionTrack.currency)}
                          </div>
                          <Badge variant="outline">{tuitionTrack.status.replace("_", " ")}</Badge>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No tuition track</div>
                      )}
                    </div>
                  </div>
                )}
                <Button variant="link" className="h-auto p-0 text-sm" asChild>
                  <Link to={`/accounting/clients/${clientId}`}>
                    View FLC accounting
                    <ExternalLink className="size-3 ml-1 inline" />
                  </Link>
                </Button>
              </Card>

              <Card className="p-5 space-y-4">
                <div>
                  <div className="font-medium">Funding plan</div>
                  <p className="text-xs text-muted-foreground">
                    Planned sources — not verified payments (Q4A).
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Deposit sources</Label>
                    {FUNDING_SOURCE_OPTIONS.map((opt) => (
                      <label key={`d-${opt.value}`} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={depositSources.includes(opt.value)}
                          disabled={!canEdit || !isQualificationEditable(selected.status)}
                          onCheckedChange={(c) =>
                            setDepositSources((prev) => toggleSource(prev, opt.value, c === true))
                          }
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tuition sources</Label>
                    {FUNDING_SOURCE_OPTIONS.map((opt) => (
                      <label key={`t-${opt.value}`} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={tuitionSources.includes(opt.value)}
                          disabled={!canEdit || !isQualificationEditable(selected.status)}
                          onCheckedChange={(c) =>
                            setTuitionSources((prev) => toggleSource(prev, opt.value, c === true))
                          }
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Textarea
                  placeholder="Notes"
                  value={fundingNotes}
                  onChange={(e) => setFundingNotes(e.target.value)}
                  disabled={!canEdit || !isQualificationEditable(selected.status)}
                  rows={2}
                />
                {canEdit && isQualificationEditable(selected.status) && (
                  <Button size="sm" onClick={() => void handleSaveFunding()} disabled={savingFunding}>
                    {savingFunding ? "Saving…" : "Save funding plan"}
                  </Button>
                )}
              </Card>

              <Card className="p-5 space-y-3">
                <div className="font-medium">Activity</div>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {events.map((ev) => (
                      <li key={ev.id} className="border-b pb-2 last:border-0">
                        <div className="font-medium">{ev.eventType.replace(/_/g, " ")}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.createdAt).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </>
      )}

      <QualificationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clientId={clientId}
        caseId={caseId}
        onCreated={() => void reload()}
      />

      {selected && transitionTo && (
        <QualificationTransitionDialog
          open={!!transitionTo}
          onOpenChange={(open) => !open && setTransitionTo(null)}
          qualification={selected}
          toStatus={transitionTo}
          onComplete={() => void reload()}
        />
      )}
    </div>
  );
}
