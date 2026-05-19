import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, UserCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fetchLead, markLeadConverted, type Lead } from "@/lib/leads";
import { LeadStatusBadge, LeadTemperatureBadge } from "@/components/leads/LeadBadges";

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

const LeadDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchLead(id).then(setLead).finally(() => setLoading(false));
  }, [id]);

  const onConvert = async () => {
    if (!lead) return;
    if (!confirm("Mark this lead as converted? (Client registration form ships in Stage 3.)")) return;
    try {
      const updated = await markLeadConverted(lead.id);
      setLead(updated);
      toast.success("Lead marked converted. Client registration form coming in Stage 3.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading) return <AppLayout><div className="p-12 text-center text-muted-foreground">Loading…</div></AppLayout>;
  if (!lead) return <AppLayout><div className="p-12 text-center text-muted-foreground">Lead not found</div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title={[lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ")}
        description={`${lead.lead_number} · ${lead.lead_temperature} · ${lead.status} · created ${format(new Date(lead.created_at), "dd MMM yyyy")}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => nav(`/leads/new?id=${lead.id}`)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            {lead.status !== "converted" && (
              <Button onClick={onConvert}>
                <UserCheck className="h-4 w-4 mr-1" /> Convert to Client
              </Button>
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
              <Row label="Coaching" value={<ChipList items={lead.coaching_services} />} />
              <Row label="Visa & Immigration" value={<ChipList items={lead.visa_services} />} />
              <Row label="Admission" value={<ChipList items={lead.admission_services} />} />
              <Row label="Allied" value={<ChipList items={lead.allied_services} />} />
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

        <Card className="p-6 space-y-2">
          <h3 className="font-semibold">Notes</h3>
          <div className="text-sm whitespace-pre-wrap">{lead.notes || <span className="text-muted-foreground">No notes</span>}</div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default LeadDetail;