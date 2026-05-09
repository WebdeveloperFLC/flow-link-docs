import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";

type N = { id: string; type: string; title: string; body: string|null; link: string|null; is_read: boolean; created_at: string };

export default function PortalNotifications() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null}/>;
}
function Inner({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<N[]>([]);
  const load = async () => {
    const { data } = await supabase.from("client_notifications").select("*").eq("client_id", clientId).order("created_at",{ascending:false}).limit(100);
    setItems((data ?? []) as N[]);
  };
  useEffect(() => { load(); }, [clientId]);
  const markRead = async (id: string) => { await supabase.from("client_notifications").update({ is_read: true }).eq("id", id); load(); };
  const markAll = async () => { await supabase.from("client_notifications").update({ is_read: true }).eq("client_id", clientId).eq("is_read", false); load(); };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Notifications</h1></div>
        <Button variant="outline" onClick={markAll}><Check className="size-4 mr-1.5"/>Mark all read</Button>
      </div>
      <Card>
        <ul className="divide-y">
          {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No notifications.</li>}
          {items.map((n) => (
            <li key={n.id} className={`p-4 flex items-start gap-3 ${!n.is_read ? "bg-primary/5" : ""}`}>
              <Bell className="size-4 text-muted-foreground mt-0.5"/>
              <div className="flex-1">
                <div className="font-medium text-sm">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {n.link && <Link to={n.link} className="text-xs text-primary underline" onClick={()=>markRead(n.id)}>View</Link>}
              {!n.is_read && <Button size="sm" variant="ghost" onClick={()=>markRead(n.id)}><Check className="size-4"/></Button>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
