import { useEffect, useMemo, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Building2, ChevronDown, UserCircle } from "lucide-react";
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
  formatApplicationEventType,
  QUALIFICATION_STATUS_LABELS,
  TRACK_STATUS_LABELS,
} from "@/lib/qualification/constants";
import { reassignQualificationOwner, updateApplicationStatus } from "@/lib/qualification/qualificationApi";
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
    events,
    loading,
    detailLoading,
    reload,
  } = useClientQualification(clientId, caseId, refreshKey);

  const [createOpen, setCreateOpen] = useState(false);
  const [transitionTo, setTransitionTo] = useState<QualificationLifecycleStatus | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<{ id: string; name: string }[]>([]);

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

  if (!caseId) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Select a service case to manage applications.
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading application…
      </Card>
    );
  }

  const handleAdmissionsStage = async (value: InstitutionApplicationStatus) => {
    if (!selected) return;
    try {
      await updateApplicationStatus(selected.id, value);
      toast.success("Admissions stage updated");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleOwnerChange = async (userId: string) => {
    if (!selected) return;
    try {
      await reassignQualificationOwner(selected.id, userId);
      toast.success("Application owner updated");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reassign failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            Student Application
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Deposit and tuition tracking to the institution — not FLC accounting.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" />
            New Application
          </Button>
        )}
      </div>

      {qualifications.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No student application on file for this service case yet.
          {canEdit && (
            <div className="mt-4">
              <Button onClick={() => setCreateOpen(true)}>Create Application</Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {qualifications.length > 1 && (
            <div className="space-y-2 max-w-md">
              <Label>Application</Label>
              <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select application" />
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
                      Application owner: {ownerName ?? "Unassigned"}
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
                            Update lifecycle
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
                    <Label>Admissions Stage</Label>
                    <Select
                      value={selected.applicationStatus ?? "APPLIED"}
                      onValueChange={(v) => void handleAdmissionsStage(v as InstitutionApplicationStatus)}
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
                      Admissions stage only — does not affect application lifecycle or FLC payments.
                    </p>
                  </div>

                  {canEdit && isQualificationEditable(selected.status) && (
                    <div className="space-y-2">
                      <Label>Reassign application owner</Label>
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
                  <div className="font-medium">Deposit Tracking · Tuition Tracking</div>
                  <p className="text-xs text-muted-foreground">
                    Amounts owed to the institution — paid amounts stay at zero until payment integration.
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
                      <div className="text-sm font-medium">Deposit Tracking</div>
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
                          <Badge variant="outline">{TRACK_STATUS_LABELS[depositTrack.status]}</Badge>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No deposit track</div>
                      )}
                    </div>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="text-sm font-medium">Tuition Tracking</div>
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
                          <Badge variant="outline">{TRACK_STATUS_LABELS[tuitionTrack.status]}</Badge>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No tuition track</div>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-3">
                <div className="font-medium">Application Timeline</div>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {events.map((ev) => (
                      <li key={ev.id} className="border-b pb-2 last:border-0">
                        <div className="font-medium">{formatApplicationEventType(ev.eventType)}</div>
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
