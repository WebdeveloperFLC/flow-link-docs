import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { fetchLeads, type Lead } from "@/lib/leads";

const LeadsList = () => {
  const nav = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeads({ temperatures: ["warm", "hot"], coldPool: false, search: search || undefined })
      .then(setLeads).finally(() => setLoading(false));
  }, [search]);

  return (
    <AppLayout>
      <PageHeader
        title="Current Leads"
        description="Warm and hot leads in the active pipeline"
        actions={
          <Button onClick={() => nav("/leads/new")}>
            <Plus className="h-4 w-4 mr-1" /> New Lead
          </Button>
        }
      />
      <div className="p-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, email, phone, lead #..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Card>
          {loading ? <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div> : <LeadsTable leads={leads} />}
        </Card>
      </div>
    </AppLayout>
  );
};

export default LeadsList;