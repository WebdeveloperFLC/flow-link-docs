import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useClientApplication } from "@/hooks/useClientApplication";
import { ApplicationLifecycleBadge } from "./ApplicationLifecycleBadge";
import { ApplicationCreateDialog } from "./ApplicationCreateDialog";
import { ApplicationTransitionDialog } from "./ApplicationTransitionDialog";
import { ApplicationReferencesPanel } from "./ApplicationReferencesPanel";
import { ApplicationOfferPanel } from "./ApplicationOfferPanel";
import { ApplicationMilestonesPanel } from "./ApplicationMilestonesPanel";
import { FinancialRequirementsPlaceholder } from "./FinancialRequirementsPlaceholder";
import {
  availableApplicationTransitions,
  isApplicationEditable,
} from "@/lib/application/lifecycle";
import {
  APPLICATION_STATUS_LABELS,
  formatApplicationEventType,
  APPLICATION_LIFECYCLE_STATUS_LABELS,
} from "@/lib/application/constants";
import { reassignApplicationOwner, updateApplicationStatus } from "@/lib/application/applicationApi";
import type { InstitutionApplicationStatus, ApplicationLifecycleStatus } from "@/lib/application/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  clientId: string;
  caseId: string | undefined;
  canEdit: boolean;
  refreshKey?: number;
  initialApplicationId?: string | null;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function SnapshotRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

export function ApplicationTabContent({
  clientId,
  caseId,
  canEdit,
  refreshKey = 0,
  initialApplicationId = null,
}: Props) {
  const {
    applications,
    selected,
    selectedId,
    setSelectedId,
    offer,
    milestones,
    events,
    references,
    loading,
    detailLoading,
    listLoadFailed,
    listError,
    reload,
  } = useClientApplication(clientId, caseId, refreshKey, initialApplicationId);

  const [createOpen, setCreateOpen] = useState(false);
  const [transitionTo, setTransitionTo] = useState<ApplicationLifecycleStatus | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<{ id: string; name: string }[]>([]);

  const transitions = useMemo(
    () => (selected ? availableApplicationTransitions(selected.status) : []),
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

  if (listLoadFailed) {
    return (
      <Card className="p-8 text-center text-sm space-y-3">
        <p className="font-medium text-destructive">Could not load applications for this service case.</p>
        {listError && <p className="text-muted-foreground">{listError}</p>}
        <Button variant="outline" onClick={() => void reload()}>
          Retry
        </Button>
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
      await reassignApplicationOwner(selected.id, userId);
      toast.success("Application owner updated");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reassign failed");
    }
  };

  const tuitionSnapshot =
    selected?.tuitionFee != null && selected.tuitionCurrency
      ? formatMoney(selected.tuitionFee, selected.tuitionCurrency)
      : null;

  return (
    <div className="space-y-6">
      <Card className="p-4 border-dashed bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Applications are normally created from{" "}
          <span className="font-medium text-foreground">Client Services → Course Finder → Mark final</span>.
          Use this tab for admissions processing: application details, offer, references, milestones, and timeline.
          Manual creation remains available when needed.
        </p>
      </Card>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            Student Application
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Application identity, offer, milestones, and references — not FLC accounting or payments.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" />
            New Application
          </Button>
        )}
      </div>

      {applications.length === 0 ? (
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
          {applications.length > 1 && (
            <div className="space-y-2 max-w-md">
              <Label>Application</Label>
              <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.institutionName ?? q.institutionNameSnapshot ?? "Institution"} — {q.intakeTerm}
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
                    <div className="font-medium text-base">
                      {selected.institutionName ?? selected.institutionNameSnapshot ?? "Institution"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selected.programName || "Program TBD"}
                      {selected.programCode ? ` (${selected.programCode})` : ""} · Intake {selected.intakeTerm}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                      <SnapshotRow
                        label="Location"
                        value={
                          [selected.institutionCitySnapshot, selected.destinationCountry ?? selected.institutionCountryName]
                            .filter(Boolean)
                            .join(", ") || null
                        }
                      />
                      <SnapshotRow label="Campus" value={selected.campusName} />
                      <SnapshotRow label="Study level" value={selected.studyLevel} />
                      <SnapshotRow
                        label="Duration"
                        value={selected.durationMonths != null ? `${selected.durationMonths} months` : null}
                      />
                      <SnapshotRow label="Tuition snapshot" value={tuitionSnapshot} />
                      <SnapshotRow label="Source" value={selected.applicationSource} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                      <UserCircle className="size-3.5" />
                      Application owner: {ownerName ?? "Unassigned"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ApplicationLifecycleBadge
                      status={selected.status}
                      holdReasonCode={selected.holdReasonCode}
                    />
                    {canEdit && isApplicationEditable(selected.status) && transitions.length > 0 && (
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
                              {APPLICATION_LIFECYCLE_STATUS_LABELS[t]}
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
                      disabled={!canEdit || !isApplicationEditable(selected.status)}
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

                  {canEdit && isApplicationEditable(selected.status) && (
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

              <ApplicationOfferPanel
                applicationId={selected.id}
                offer={offer}
                canEdit={canEdit && isApplicationEditable(selected.status)}
                loading={detailLoading}
                onChanged={reload}
              />

              <ApplicationReferencesPanel
                applicationId={selected.id}
                references={references}
                institutionCountryName={selected.institutionCountryName ?? selected.destinationCountry}
                canEdit={canEdit && isApplicationEditable(selected.status)}
                loading={detailLoading}
                onChanged={reload}
              />

              <ApplicationMilestonesPanel
                applicationId={selected.id}
                milestones={milestones}
                canEdit={canEdit && isApplicationEditable(selected.status)}
                loading={detailLoading}
                onChanged={reload}
              />

              <FinancialRequirementsPlaceholder />

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

      <ApplicationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clientId={clientId}
        caseId={caseId}
        onCreated={() => void reload()}
      />

      {selected && transitionTo && (
        <ApplicationTransitionDialog
          open={!!transitionTo}
          onOpenChange={(open) => !open && setTransitionTo(null)}
          application={selected}
          toStatus={transitionTo}
          onComplete={() => void reload()}
        />
      )}
    </div>
  );
}
