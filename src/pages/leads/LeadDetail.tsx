import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, UserCheck, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fetchLead, fetchServiceCodeMap, type Lead } from "@/lib/leads";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { LeadOwnerCard } from "@/components/leads/LeadOwnerCard";
import { WhatsAppInboxLink } from "@/components/whatsapp/WhatsAppInboxLink";
import { leadPhoneToE164 } from "@/lib/whatsapp/phone";
import { useMasterItems } from "@/lib/masters";
import { leadWarmHotSchema, formatLeadValidationError } from "@/lib/leadSchemas";
import {
  hasBudgetLabel,
  sponsorLabel,
  startTimelineLabel,
} from "@/lib/leadJourney";
import { formatBudgetRange } from "@/lib/currencyMaster";
import {
  followupChannelLabel,
  formatFollowupDue,
  followupDueState,
} from "@/lib/leadFollowup";
import { LeadFollowupLogPanel } from "@/components/leads/LeadFollowupLogPanel";
import { LeadBackgroundOverview } from "@/components/leads/LeadBackgroundOverview";
import { syncLeadFollowupLog } from "@/lib/leadFollowupLog";
import { leadToBackgroundState } from "@/lib/leadBackground";
import { buildLeadCustomComboCodes } from "@/lib/leads/leadServicePreview";
import { ConvertLeadConfirmDialog } from "@/components/leads/ConvertLeadConfirmDialog";
import { ConversionResultSummaryDialog } from "@/components/leads/ConversionResultSummaryDialog";
import { useLeadConversion } from "@/hooks/useLeadConversion";
import { useProfileNameMap } from "@/hooks/useProfileNameMap";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-0.5">
    <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
  </div>
);

const ChipList = ({ items }: { items: string[] | null | undefined }) => {
  if (!items?.length) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => <Badge key={i} variant="secondary">{i}</Badge>)}
    </div>
  );
};

const ServiceChipList = ({ items, map }: { items: string[] | null | undefined; map: Map<string, string> }) => {
  if (!items?.length) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((code) => (
        <Badge key={code} variant="secondary" title={code}>{map.get(code) ?? code}</Badge>
      ))}
    </div>
  );
};

const LeadDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const qualificationLevels = useMasterItems("qualification_levels");
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceMap, setServiceMap] = useState<Map<string, string>>(new Map());
  const [convertedClient, setConvertedClient] = useState<{
    id: string;
    application_id: string | null;
    registration_number: string | null;
  } | null>(null);
  const [followupLogVersion, setFollowupLogVersion] = useState(0);

  const counselorIds = useMemo(
    () => (lead?.assigned_counselor_id ? [lead.assigned_counselor_id] : []),
    [lead?.assigned_counselor_id],
  );
  const counselorNames = useProfileNameMap(counselorIds);

  const conversion = useLeadConversion({
    resolveClientHref: (clientId) => `/clients/${clientId}`,
    onNavigate: ({ href }) => nav(href),
    resolveCounselorName: (l) =>
      l.assigned_counselor_id ? counselorNames[l.assigned_counselor_id] ?? null : null,
    resolveServiceLabels: (l) => {
      const codes = [
        ...(l.coaching_services ?? []),
        ...(l.visa_services ?? []),
        ...(l.admission_services ?? []),
        ...(l.allied_services ?? []),
        ...(l.travel_financial_services ?? []),
      ];
      return codes.map((c) => serviceMap.get(c) ?? c);
    },
  });

  const ensureFollowupSynced = async (): Promise<boolean> => {
    if (!lead?.next_followup_at) return false;
    try {
      await syncLeadFollowupLog(lead.id, {
        scheduledAt: lead.next_followup_at,
        channel: lead.followup_channel,
        note: lead.followup_note,
      });
      setFollowupLogVersion((v) => v + 1);
      return true;
    } catch (e) {
      toast.error(formatSupabaseError(e, "Could not sync follow-up"));
      return false;
    }
  };

  const onRegisterAsClient = async () => {
    if (!lead) return;
    const isCold = lead.lead_type === "cold" || lead.is_cold_pool;
    if (!isCold) {
      const validation = leadWarmHotSchema.safeParse({
        ...lead,
        travel_services: lead.travel_financial_services ?? [],
      });
      if (!validation.success) {
        toast.error(formatLeadValidationError(validation.error, "Complete required lead fields before converting"));
        return;
      }
    }
    await conversion.requestConversion(lead, { leadNotes: lead.notes ?? undefined });
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchLead(id), fetchServiceCodeMap()])
      .then(([l, m]) => { setLead(l); setServiceMap(m); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!lead || lead.status !== "converted") return;
    (supabase.from("clients") as any)
      .select("id, application_id, registration_number")
      .eq("source_lead_id", lead.id)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setConvertedClient(data); });
  }, [lead]);

  if (loading) return <AppLayout><div className="p-12 text-center text-muted-foreground">Loading…</div></AppLayout>;
  if (!lead) return <AppLayout><div className="p-12 text-center text-muted-foreground">Lead not found</div></AppLayout>;

  const lastEducationLabel =
    qualificationLevels.find((q) => q.code === lead.last_education)?.label ??
    lead.last_education;
  const sponsorDisplay =
    lead.sponsor === "other" && lead.sponsor_other
      ? `${sponsorLabel(lead.sponsor)} — ${lead.sponsor_other}`
      : sponsorLabel(lead.sponsor);
  const customComboCodes = buildLeadCustomComboCodes(lead);

  return (
    <AppLayout>
      <PageHeader
        title={[lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ")}
        description={`${lead.lead_number} · ${lead.lead_temperature} · ${lead.status} · created ${format(new Date(lead.created_at), "dd MMM yyyy")}`}
        actions={
          <div className="flex gap-2">
            <WhatsAppInboxLink
              phone={leadPhoneToE164(lead.phone, lead.phone_country_code)}
              leadId={lead.id}
            />
            <Button variant="outline" onClick={() => nav(`/leads/new?id=${lead.id}`)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            {lead.status !== "converted" ? (
              <Button onClick={() => void onRegisterAsClient()} disabled={conversion.converting}>
                <UserCheck className="h-4 w-4 mr-1" />
                {conversion.converting ? "Converting…" : "Register as Client"}
              </Button>
            ) : convertedClient ? (
              <Button variant="outline" asChild>
                <Link to={`/clients/${convertedClient.id}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Client file
                  {convertedClient.application_id ? ` · ${convertedClient.application_id}` : ""}
                  {convertedClient.registration_number ? ` · Reg ${convertedClient.registration_number}` : ""}
                </Link>
              </Button>
            ) : (
              <Badge variant="secondary">Converted</Badge>
            )}
          </div>
        }
      />
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">Personal</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="First Name" value={lead.first_name} />
            <Row label="Middle Name" value={lead.middle_name} />
            <Row label="Last Name" value={lead.last_name} />
            <Row label="Gender" value={lead.gender} />
            <Row label="Marital Status" value={lead.marital_status} />
            <Row label="Email" value={lead.email} />
            <Row label="Phone" value={[lead.phone_country_code, lead.phone].filter(Boolean).join(" ")} />
          </div>
        </Card>

        {!lead.is_cold_pool && (
          <>
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Geography</h3>
              <div className="grid grid-cols-2 gap-4">
                <Row label="Citizenship" value={lead.country_of_citizenship} />
                <Row label="Residence" value={lead.country_of_residence} />
              </div>
              <Row label="Interested Countries" value={<ChipList items={lead.interested_countries} />} />
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Background</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Row label="Last Education" value={lastEducationLabel} />
                {String(lead.last_education ?? "").toLowerCase() === "other" && (
                  <Row label="Education (specify)" value={lead.last_education_other} />
                )}
              </div>
            </Card>

            <LeadBackgroundOverview background={leadToBackgroundState(lead)} />

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Funding &amp; Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Row label="Sponsor" value={sponsorDisplay} />
                <Row label="Start Timeline" value={startTimelineLabel(lead.start_timeline)} />
                <Row label="Has Budget" value={hasBudgetLabel(lead.has_budget)} />
                {lead.has_budget === "yes" && (
                  <Row
                    label="Budget Range"
                    value={formatBudgetRange(
                      lead.budget_min ?? null,
                      lead.budget_max ?? null,
                      lead.budget_currency || "INR",
                    )}
                  />
                )}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                Services {lead.visa_locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Visa locked</Badge>}
              </h3>
              <Row label="Coaching" value={<ServiceChipList items={lead.coaching_services} map={serviceMap} />} />
              <Row label="Visa & Immigration" value={<ServiceChipList items={lead.visa_services} map={serviceMap} />} />
              <Row label="Admission" value={<ServiceChipList items={lead.admission_services} map={serviceMap} />} />
              <Row label="Allied" value={<ServiceChipList items={lead.allied_services} map={serviceMap} />} />
              <Row
                label="Travel & Financial"
                value={<ServiceChipList items={lead.travel_financial_services} map={serviceMap} />}
              />
              {customComboCodes.length > 0 && (
                <Row
                  label="Custom Combo"
                  value={<ServiceChipList items={customComboCodes} map={serviceMap} />}
                />
              )}
              {lead.visa_locked && <Row label="Visa lock reason" value={lead.visa_lock_reason} />}
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Row label="Branch" value={lead.branch} />
                <Row label="Department" value={lead.department} />
                <LeadOwnerCard
                  compact
                  leadId={lead.id}
                  assignedCounselorId={lead.assigned_counselor_id ?? null}
                  branch={lead.branch}
                  department={lead.department}
                  convertedClientId={lead.converted_to_client_id}
                  onChanged={() => fetchLead(lead.id).then((l) => l && setLead(l))}
                />
                <Row label="Lead Source" value={lead.lead_source} />
                <Row label="Temperature" value={lead.lead_temperature} />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                Follow-up
                {followupDueState(lead.next_followup_at) === "overdue" && (
                  <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                )}
                {followupDueState(lead.next_followup_at) === "due" && (
                  <Badge variant="secondary" className="text-[10px]">Due now</Badge>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Row label="Next follow-up" value={formatFollowupDue(lead.next_followup_at)} />
                <Row label="Channel" value={followupChannelLabel(lead.followup_channel)} />
                <Row label="Note" value={lead.followup_note} />
              </div>
              {lead.status !== "converted" && (
                <LeadFollowupLogPanel
                  leadId={lead.id}
                  hasOpenFollowup={!!lead.next_followup_at}
                  refreshToken={followupLogVersion}
                  ensureSynced={ensureFollowupSynced}
                  onCompleted={() => {
                    fetchLead(lead.id).then((l) => {
                      if (l) setLead(l);
                      setFollowupLogVersion((v) => v + 1);
                    });
                  }}
                  onNotesMigrated={() => {
                    fetchLead(lead.id).then((l) => {
                      if (l) setLead(l);
                    });
                  }}
                />
              )}
            </Card>
          </>
        )}

        {lead.is_cold_pool && (
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Cold Pool</h3>
            <div className="grid grid-cols-2 gap-4">
              <Row label="Campaign" value={lead.cold_pool_campaign} />
              <Row label="Source" value={lead.lead_source} />
            </div>
          </Card>
        )}

        {(lead.is_cold_pool || lead.lead_type === "cold") && (
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              Follow-up
              {followupDueState(lead.next_followup_at) === "overdue" && (
                <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Row label="Next follow-up" value={formatFollowupDue(lead.next_followup_at)} />
              <Row label="Channel" value={followupChannelLabel(lead.followup_channel)} />
              <Row label="Note" value={lead.followup_note} />
            </div>
            {lead.status !== "converted" && (
              <LeadFollowupLogPanel
                leadId={lead.id}
                hasOpenFollowup={!!lead.next_followup_at}
                refreshToken={followupLogVersion}
                ensureSynced={ensureFollowupSynced}
                onCompleted={() => {
                  fetchLead(lead.id).then((l) => {
                    if (l) setLead(l);
                    setFollowupLogVersion((v) => v + 1);
                  });
                }}
                onNotesMigrated={() => {
                  fetchLead(lead.id).then((l) => {
                    if (l) setLead(l);
                  });
                }}
              />
            )}
          </Card>
        )}

        <Card className="p-6 space-y-2">
          <h3 className="font-semibold">Notes</h3>
          <div className="text-sm whitespace-pre-wrap">{lead.notes || <span className="text-muted-foreground">No notes</span>}</div>
        </Card>
      </div>

      <ConvertLeadConfirmDialog
        open={conversion.confirmOpen}
        summary={conversion.confirmSummary}
        busy={conversion.converting}
        onClose={conversion.closeConfirm}
        onConfirm={(reason) => void conversion.confirmConversion(reason)}
      />
      <ConversionResultSummaryDialog
        open={conversion.resultOpen}
        result={conversion.conversionResult}
        clientHref={conversion.clientHref}
        onClose={conversion.closeResult}
        onResultChange={conversion.setConversionResult}
      />
    </AppLayout>
  );
};

export default LeadDetail;