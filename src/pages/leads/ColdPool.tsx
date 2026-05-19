import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { fetchLeads, type Lead } from "@/lib/leads";

const ColdPool = () => {
  const nav = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeads({ coldPool: true, search: search || undefined })
      .then(setLeads).finally(() => setLoading(false));
  }, [search]);

  return (
    <AppLayout>
      <PageHeader
        title="Cold Pool"
        description="Bulk-imported / low-engagement leads awaiting first contact"
        actions={
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" disabled>
                      <Upload className="h-4 w-4 mr-1" /> Import CSV
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Bulk CSV import ships in Stage 3</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => nav("/leads/new?mode=cold")}>
              <Plus className="h-4 w-4 mr-1" /> New Cold Lead
            </Button>
          </div>
        }
      />
      <div className="p-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Card>
          {loading ? <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div> : <LeadsTable leads={leads} showCampaign />}
        </Card>
      </div>
    </AppLayout>
  );
};

export default ColdPool;