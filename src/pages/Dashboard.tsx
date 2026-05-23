import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Users, FileStack, FileCheck2, AlertTriangle, ArrowUpRight, Building2, Handshake, ListChecks, Sparkles, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { StatCard, type StatTone } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ clients: 0, documents: 0, binders: 0, missing: 0 });
  const [upiStats, setUpiStats] = useState({ institutions: 0, partners: 0, coursesPending: 0, suggestionsPending: 0 });
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

      const [ti, pi, cp, sp] = await Promise.all([
        supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_partner", true),
        supabase.from("upi_courses_staging").select("*", { count: "exact", head: true }).eq("review_status", "pending_review"),
        supabase.from("upi_ai_suggestions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setUpiStats({
        institutions: ti.count ?? 0,
        partners: pi.count ?? 0,
        coursesPending: cp.count ?? 0,
        suggestionsPending: sp.count ?? 0,
      });
    })();
  }, []);

  const cards: { label: string; value: number; icon: typeof Users; tone: StatTone }[] = [
    { label: "Total Clients", value: stats.clients, icon: Users, tone: "clients" },
    { label: "Documents Processed", value: stats.documents, icon: FileStack, tone: "documents" },
    { label: "Binders Generated", value: stats.binders, icon: FileCheck2, tone: "binders" },
    { label: "Pending Review", value: Math.max(0, stats.clients - stats.binders), icon: AlertTriangle, tone: "review" },
  ];

  const upiCards: { label: string; value: number; icon: typeof Users; tone: StatTone; to: string }[] = [
    { label: "Total Institutions", value: upiStats.institutions, icon: Building2, tone: "institutions", to: "/institutions" },
    { label: "Partner Institutions", value: upiStats.partners, icon: Handshake, tone: "binders", to: "/institutions" },
    { label: "Courses Pending Review", value: upiStats.coursesPending, icon: ListChecks, tone: "review", to: "/institutions/review" },
    { label: "AI Suggestions Pending", value: upiStats.suggestionsPending, icon: Sparkles, tone: "ai", to: "/institutions/suggestions" },
  ];

  return (
    <AppLayout>
      <PageHeader title="Dashboard" description={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}.`} />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upiCards.map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} to={c.to} />
          ))}
        </div>

        <Card className="overflow-hidden shadow-elev-sm">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <div className="font-display font-semibold text-base">Recent clients</div>
              <div className="text-xs text-muted-foreground">Latest profiles added</div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/clients">View all <ArrowUpRight className="size-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="divide-y">
            {recentClients.length === 0 && (
              <EmptyState
                icon={UserPlus}
                title="No clients yet"
                description="Start managing your educational consulting workflow by adding your first client profile."
                action={
                  <Button asChild>
                    <Link to="/clients/new">Create the first one</Link>
                  </Button>
                }
              />
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