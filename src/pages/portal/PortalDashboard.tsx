import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPortalPipelineProgress, type PortalPipelineProgress } from "@/lib/portalPipelineProgress";
import { PortalPipelineProgressBar, portalProgressPercent } from "@/components/portal/PortalPipelineProgressBar";
import { fetchMasterItemsAll } from "@/lib/masters";
import { portalClientStatusLabel } from "@/lib/clientStatus";
import { FileText, Tag, CreditCard, Upload, Calendar, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const STATUS_COLORS: Record<string,string> = {
  verified: "hsl(var(--primary))", pending: "hsl(45 93% 47%)",
  action_required: "hsl(0 84% 60%)", rejected: "hsl(0 84% 60%)", not_uploaded: "hsl(var(--muted-foreground))"
};

export default function PortalDashboard() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : <NoLink/>} />;
}

function NoLink() {
  return (
    <Card className="p-6 text-center">
      <h2 className="text-lg font-semibold mb-2">Account not linked yet</h2>
      <p className="text-sm text-muted-foreground">Your counselor will link your case shortly. Please contact them or check back later.</p>
    </Card>
  );
}

function Inner({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<{
    full_name: string | null;
    lead_stage: string | null;
    status: string | null;
    application_type: string | null;
  } | null>(null);
  const [portalStatusLabel, setPortalStatusLabel] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<PortalPipelineProgress>({
    pipelineId: null,
    pipelineName: null,
    currentStageId: null,
    currentStageLabel: null,
    progressPercent: 0,
    stages: [],
  });
  const [files, setFiles] = useState<{ status: string }[]>([]);
  const [offers, setOffers] = useState<number>(0);
  const [tasks, setTasks] = useState<number>(0);
  const [wallet, setWallet] = useState<{ available_points: number; points_value_rate: number }|null>(null);
  const [activity, setActivity] = useState<{ id: string; summary: string; created_at: string }[]>([]);
  const [activeOffers, setActiveOffers] = useState<{ id: string; offer: { title: string; description: string|null; discount_type: string; discount_value: number; valid_to: string|null } }[]>([]);

  useEffect(() => {
    (async () => {
      const [c, f, o, t, w, tl, ao] = await Promise.all([
        supabase.from("clients").select("full_name,lead_stage,status,application_type").eq("id", clientId).maybeSingle(),
        supabase.from("client_files").select("status").eq("client_id", clientId),
        supabase.from("client_offers").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "active"),
        supabase.from("client_tasks").select("id", { count: "exact", head: true }).eq("client_id", clientId).neq("status", "done"),
        supabase.from("credit_wallet").select("available_points,points_value_rate").eq("client_id", clientId).maybeSingle(),
        supabase.from("client_timeline").select("id,summary,created_at").eq("client_id", clientId).order("created_at",{ascending:false}).limit(5),
        supabase.from("client_offers").select("id, offer:offers(title,description,discount_type,discount_value,valid_to)").eq("client_id", clientId).eq("status","active").limit(3),
      ]);
      setClient(c.data ?? null);
      const statusItems = await fetchMasterItemsAll("client_statuses");
      setPortalStatusLabel(portalClientStatusLabel(c.data?.status ?? null, statusItems));
      setFiles((f.data ?? []) as { status: string }[]);
      setOffers(o.count ?? 0);
      setTasks(t.count ?? 0);
      setWallet(w.data ?? { available_points: 0, points_value_rate: 1 });
      setActivity((tl.data ?? []) as { id: string; summary: string; created_at: string }[]);
      setActiveOffers((ao.data ?? []) as Array<{ id: string; offer: { title: string; description: string | null; discount_type: string; discount_value: number; valid_to: string | null } }>);
      setPipelineProgress(await fetchPortalPipelineProgress(clientId));
    })();
  }, [clientId]);

  const progressLabel = `${portalProgressPercent(pipelineProgress, client?.lead_stage)}%`;
  const submitted = files.filter((f) => f.status !== "not_uploaded").length;
  const total = Math.max(files.length, 1);

  const counts = files.reduce((acc, f) => { acc[f.status] = (acc[f.status]||0)+1; return acc; }, {} as Record<string, number>);
  const pieData = ["verified","pending","action_required","rejected"].map((k) => ({ name: k, value: counts[k]||0 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {client?.full_name ?? "Client"}</h1>
          <p className="text-sm text-muted-foreground">
            {client?.application_type ?? ""}
            {portalStatusLabel ? ` · ${portalStatusLabel}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Application Progress" value={String(progressLabel)} />
        <Kpi label="Files Submitted" value={`${submitted} / ${files.length}`} />
        <Kpi label="Tasks Pending" value={String(tasks)} />
        <Kpi label="Credit Points" value={(wallet?.available_points ?? 0).toString()} sub={`$${((wallet?.available_points ?? 0) * (wallet?.points_value_rate ?? 1)).toFixed(2)} value`} />
        <Kpi label="Active Offers" value={String(offers)} />
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Application Progress</h3>
        <PortalPipelineProgressBar
          progress={pipelineProgress}
          legacyLeadStage={client?.lead_stage}
        />
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">File Status Overview</h3>
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80}>
                  {pieData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name]}/>) }
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Active Offers</h3>
          {activeOffers.length === 0 ? <p className="text-sm text-muted-foreground">No active offers right now.</p> :
            <div className="space-y-2">
              {activeOffers.map((o) => (
                <div key={o.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.offer.title}</div>
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {o.offer.discount_type === "percentage" ? `${o.offer.discount_value}% OFF` : `$${o.offer.discount_value} OFF`}
                    </span>
                  </div>
                  {o.offer.description && <div className="text-xs text-muted-foreground mt-1">{o.offer.description}</div>}
                </div>
              ))}
            </div>}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        {activity.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> :
          <ul className="divide-y">
            {activity.map((a) => (
              <li key={a.id} className="py-2 flex justify-between text-sm">
                <span>{a.summary}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <QuickAction to="/portal/files" icon={Upload} label="Upload Document" />
          <QuickAction to="/portal/appointments" icon={Calendar} label="Book Appointment" />
          <QuickAction to="/portal/payments" icon={CreditCard} label="Payments" />
          <QuickAction to="/portal/refer" icon={Tag} label="Refer Friend" />
          <QuickAction to="/portal/chat" icon={MessageCircle} label="Chat" />
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function QuickAction({ to, icon: I, label }: { to: string; icon: typeof FileText; label: string }) {
  return (
    <Link to={to}>
      <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
        <I className="size-5"/> <span className="text-xs">{label}</span>
      </Button>
    </Link>
  );
}