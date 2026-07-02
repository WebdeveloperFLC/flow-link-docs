import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play, Pause, Coffee, SkipForward } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { MyQueueTab } from "@/components/telecaller/MyQueueTab";
import { InboxTab } from "@/components/telecaller/InboxTab";
import { TodayCallsTab } from "@/components/telecaller/TodayCallsTab";
import { ListsTab } from "@/components/telecaller/ListsTab";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CallerStatus = "calling" | "paused" | "break" | "offline";

const Telecaller = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const isTelecaller = hasRole(["telecaller"]);
  const mask = isTelecaller && !isAdmin;
  const [status, setStatus] = useState<CallerStatus>("offline");

  useEffect(() => {
    if (!user) return;
    supabase.from("telecaller_status").select("status").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.status) setStatus(data.status as CallerStatus); });
  }, [user]);

  const setStatusRemote = async (s: CallerStatus) => {
    if (!user) return;
    setStatus(s);
    const { error } = await supabase.from("telecaller_status").upsert({ user_id: user.id, status: s, changed_at: new Date().toISOString() });
    if (error) toast.error(error.message);
  };

  const STATUS_VARIANT = {
    calling: "success",
    paused: "warning",
    break: "warning",
    offline: "muted",
  } as const;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Telecaller workspace" description="Operate the call queue, log remarks, and hand off leads" />

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={STATUS_VARIANT[status]} className="border">{status.toUpperCase()}</StatusBadge>
          <Button size="sm" variant={status === "calling" ? "default" : "outline"} onClick={() => setStatusRemote("calling")}>
            <Play className="size-4 mr-1.5" />Start calling
          </Button>
          <Button size="sm" variant={status === "paused" ? "default" : "outline"} onClick={() => setStatusRemote("paused")}>
            <Pause className="size-4 mr-1.5" />Pause
          </Button>
          <Button size="sm" variant={status === "break" ? "default" : "outline"} onClick={() => setStatusRemote("break")}>
            <Coffee className="size-4 mr-1.5" />Break
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatusRemote("offline")}>
            <SkipForward className="size-4 mr-1.5" aria-hidden="true" />Go offline
          </Button>
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">My queue</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="today">Today's calls</TabsTrigger>
            <TabsTrigger value="lists">Lists & import</TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="mt-4"><MyQueueTab mask={mask} /></TabsContent>
          <TabsContent value="inbox" className="mt-4"><InboxTab /></TabsContent>
          <TabsContent value="today" className="mt-4"><TodayCallsTab /></TabsContent>
          <TabsContent value="lists" className="mt-4"><ListsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Telecaller;