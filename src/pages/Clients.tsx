import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, ArrowUpRight, Globe2 } from "lucide-react";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { useAuth } from "@/contexts/AuthContext";

interface Client {
  id: string;
  full_name: string;
  application_id: string;
  country: string;
  application_type: string;
  status: string;
  created_at: string;
}

const Clients = () => {
  const { canEdit } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = clients.filter((c) =>
    `${c.full_name} ${c.application_id} ${c.country} ${c.application_type}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Clients"
        description="Manage applicant profiles and their document workspaces."
        actions={
          canEdit && (
            <Button onClick={() => setOpen(true)} className="gradient-brand text-primary-foreground">
              <Plus className="size-4 mr-1.5" /> New client
            </Button>
          )
        }
      />
      <div className="p-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, ID, country…" className="pl-9" />
        </div>

        <Card className="overflow-hidden shadow-elev-sm">
          <div className="grid grid-cols-12 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
            <div className="col-span-4">Client</div>
            <div className="col-span-2">App ID</div>
            <div className="col-span-2">Country</div>
            <div className="col-span-3">Application Type</div>
            <div className="col-span-1 text-right">Open</div>
          </div>
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                {clients.length === 0 ? "No clients yet." : "No matches."}
              </div>
            )}
            {filtered.map((c) => (
              <Link key={c.id} to={`/clients/${c.id}`} className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-accent/40 transition-colors">
                <div className="col-span-4 font-medium">{c.full_name}</div>
                <div className="col-span-2 text-sm font-mono text-primary">{c.application_id}</div>
                <div className="col-span-2 text-sm flex items-center gap-1.5"><Globe2 className="size-3.5 text-muted-foreground" />{c.country}</div>
                <div className="col-span-3 text-sm text-muted-foreground">{c.application_type}</div>
                <div className="col-span-1 text-right"><ArrowUpRight className="size-4 inline text-muted-foreground" /></div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <NewClientDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </AppLayout>
  );
};

export default Clients;