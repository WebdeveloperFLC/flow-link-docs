import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Users, FileStack, FileCheck2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ clients: 0, documents: 0, binders: 0, missing: 0 });
  const [recentClients, setRecent] = useState<{ id: string; full_name: string; application_id: string; country: string; application_type: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [c, d, b] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("client_documents").select("*", { count: "exact", head: true }),
        supabase.from("binders").select("*", { count: "exact", head: true }),
      ]);
      setStats((s) => ({ ...s, clients: c.count ?? 0, documents: d.count ?? 0, binders: b.count ?? 0 }));

      const { data } = await supabase
        .from("clients")
        .select("id,full_name,application_id,country,application_type")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecent(data ?? []);
    })();
  }, []);

  const cards = [
    { label: "Total Clients", value: stats.clients, icon: Users, accent: "text-primary" },
    { label: "Documents Processed", value: stats.documents, icon: FileStack, accent: "text-primary" },
    { label: "Binders Generated", value: stats.binders, icon: FileCheck2, accent: "text-success" },
    { label: "Pending Review", value: Math.max(0, stats.clients - stats.binders), icon: AlertTriangle, accent: "text-secondary" },
  ];

  return (
    <AppLayout>
      <PageHeader title="Dashboard" description={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}.`} />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-5 shadow-elev-sm hover:shadow-elev-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</div>
                  <div className="text-3xl font-bold mt-2 tabular-nums">{c.value}</div>
                </div>
                <div className="size-10 rounded-lg bg-accent flex items-center justify-center">
                  <c.icon className={`size-5 ${c.accent}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden shadow-elev-sm">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <div className="font-semibold">Recent clients</div>
              <div className="text-xs text-muted-foreground">Latest profiles added</div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/clients">View all <ArrowUpRight className="size-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="divide-y">
            {recentClients.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No clients yet. <Link to="/clients" className="text-primary font-medium">Create the first one →</Link>
              </div>
            )}
            {recentClients.map((c) => (
              <Link key={c.id} to={`/clients/${c.id}`} className="block px-6 py-3.5 hover:bg-accent/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">{c.application_id} · {c.country} · {c.application_type}</div>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;