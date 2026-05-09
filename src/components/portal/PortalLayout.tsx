import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, FolderCheck, MessageCircle, Tag, Users as UsersIcon, CreditCard, Calendar, Bell, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getMyPortalClientId } from "@/lib/portal";

const NAV = [
  { to: "/portal", icon: Home, label: "Dashboard", end: true },
  { to: "/portal/application", icon: FileText, label: "My Application" },
  { to: "/portal/files", icon: FolderCheck, label: "File Status" },
  { to: "/portal/chat", icon: MessageCircle, label: "Chat" },
  { to: "/portal/offers", icon: Tag, label: "Offers & Discounts" },
  { to: "/portal/refer", icon: UsersIcon, label: "Refer & Earn" },
  { to: "/portal/payments", icon: CreditCard, label: "Payments" },
  { to: "/portal/appointments", icon: Calendar, label: "Appointments" },
  { to: "/portal/notifications", icon: Bell, label: "Notifications" },
  { to: "/portal/settings", icon: Settings, label: "Profile & Settings" },
];

interface Ctx { clientId: string | null; clientName: string | null; unread: number }

export function PortalLayout({ children, render }: { children?: ReactNode; render?: (ctx: Ctx) => ReactNode }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    getMyPortalClientId(user.id).then(async (cid) => {
      setClientId(cid);
      if (cid) {
        const { data } = await supabase.from("clients").select("full_name").eq("id", cid).maybeSingle();
        setClientName(data?.full_name ?? null);
        const { count } = await supabase.from("client_notifications")
          .select("id", { count: "exact", head: true })
          .eq("client_id", cid).eq("is_read", false);
        setUnread(count ?? 0);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!clientId) return;
    const ch = supabase.channel(`portal-notif-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_notifications", filter: `client_id=eq.${clientId}` }, async () => {
        const { count } = await supabase.from("client_notifications")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId).eq("is_read", false);
        setUnread(count ?? 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId]);

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <aside className="w-60 bg-background border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="font-bold text-lg">Client Portal</div>
          <div className="text-xs text-muted-foreground truncate">{clientName ?? user?.email}</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}>
              <n.icon className="size-4" />
              <span className="flex-1">{n.label}</span>
              {n.to === "/portal/notifications" && unread > 0 && (
                <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={async () => { await signOut(); nav("/portal/auth"); }}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 max-w-7xl mx-auto">
          {render ? render({ clientId, clientName, unread }) : children}
        </div>
      </main>
    </div>
  );
}