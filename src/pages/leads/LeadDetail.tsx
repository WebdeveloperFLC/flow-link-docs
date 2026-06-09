import { useEffect, useState } from "react";
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
import { LeadOwnerCard } from "@/components/leads/LeadOwnerCard";
import { WhatsAppInboxLink } from "@/components/whatsapp/WhatsAppInboxLink";
import { leadPhoneToE164 } from "@/lib/whatsapp/phone";
// badges shown inline via PageHeader description string

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
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceMap, setServiceMap] = useState<Map<string, string>>(new Map());
  const [convertedClient, setConvertedClient] = useState<{ id: string; client_number: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchLead(id), fetchServiceCodeMap()])
      .then(([l, m]) => { setLead(l); setServiceMap(m); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!lead || lead.status !== "converted") return;
    (supabase.from("clients") as any)
      .select("id, client_number")
      .eq("source_lead_id", lead.id)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setConvertedClient(data); });
  }, [lead]);

  if (loading) return <AppLayout><div className="p-12 text-center text-muted-foreground">Loading…</div></AppLayout>;
  if (!lead) return <AppLayout><div className="p-12 text-center text-muted-foreground">Lead not found</div></AppLayout>;

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
              <Button onClick={() => nav(`/leads/new?id=${lead.id}&register_client=1`)}>
                <UserCheck className="h-4 w-4 mr-1" /> Register as Client
              </Button>
            ) : convertedClient ? (
              <Button variant="outline" asChild>
                <Link to={`/clients/${convertedClient.id}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Converted{convertedClient.client_number ? ` · ${convertedClient.client_number}` : ""}
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
              <h3 className="font-semibold flex items-center gap-2">
                Services {lead.visa_locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Visa locked</Badge>}
              </h3>
              <Row label="Coaching" value={<ServiceChipList items={lead.coaching_services} map={serviceMap} />} />
              <Row label="Visa & Immigration" value={<ServiceChipList items={lead.visa_services} map={serviceMap} />} />
              <Row label="Admission" value={<ServiceChipList items={lead.admission_services} map={serviceMap} />} />
              <Row label="Allied" value={<ServiceChipList items={lead.allied_services} map={serviceMap} />} />
              {lead.visa_locked && <Row label="Visa lock reason" value={lead.visa_lock_reason} />}
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Assignment</h3>
              <div className="grid grid-cols-3 gap-4">
                <Row label="Branch" value={lead.branch} />
                <Row label="Department" value={lead.department} />
                <Row label="Source" value={lead.lead_source} />
              </div>
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

        <LeadOwnerCard
          leadId={lead.id}
          assignedCounselorId={lead.assigned_counselor_id ?? null}
          onChanged={() => fetchLead(lead.id).then((l) => l && setLead(l))}
        />

        <Card className="p-6 space-y-2">
          <h3 className="font-semibold">Notes</h3>
          <div className="text-sm whitespace-pre-wrap">{lead.notes || <span className="text-muted-foreground">No notes</span>}</div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default LeadDetail;