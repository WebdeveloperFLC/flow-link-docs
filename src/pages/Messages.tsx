import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  listMyChannels,
  createDM,
  createGroup,
  listClientChatThreads,
  type ChatChannel,
  type ClientChatThreadSummary,
} from "@/lib/chat";
import { UnifiedChat } from "@/components/chat/UnifiedChat";
import { Plus, Users, MessageSquare, Briefcase, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

type MessagesTab = "clients" | "direct" | "groups";
type ClientChannelTab = "internal" | "portal";

const Messages = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as MessagesTab) || "clients";
  const activeChannelId = params.get("channel");
  const activeClientId = params.get("client");
  const clientChannel = (params.get("clientChannel") as ClientChannelTab) || "internal";

  const [channels, setChannels] = useState<(ChatChannel & { members: string[] })[]>([]);
  const [clientThreads, setClientThreads] = useState<ClientChatThreadSummary[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [openNew, setOpenNew] = useState<null | "dm" | "group">(null);

  const refreshChannels = useCallback(async () => {
    const list = await listMyChannels();
    setChannels(list);
  }, []);

  const refreshClientThreads = useCallback(async () => {
    const list = await listClientChatThreads();
    setClientThreads(list);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([refreshChannels(), refreshClientThreads()]);
  }, [refreshChannels, refreshClientThreads]);

  useEffect(() => {
    refresh();
    supabase.from("profiles").select("id,full_name,email").then(({ data }) => setProfiles(data ?? []));
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`channels:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_channel_members", filter: `user_id=eq.${user.id}` },
        () => refreshChannels(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, refreshChannels]);

  useEffect(() => {
    const ch = supabase
      .channel("messages-client-threads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        refreshClientThreads();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refreshClientThreads]);

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.full_name || p.email || p.id.slice(0, 6)])),
    [profiles],
  );

  const labelFor = (c: ChatChannel & { members: string[] }) => {
    if (c.type === "team_group") return c.name || "Untitled group";
    const other = c.members.find((m) => m !== user?.id);
    return other ? (profileMap.get(other) ?? "Direct message") : "Direct message";
  };

  const directChannels = channels.filter((c) => c.type === "direct");
  const groupChannels = channels.filter((c) => c.type === "team_group");

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ??
    (tab === "direct"
      ? directChannels.find((c) => c.id === activeChannelId)
      : groupChannels.find((c) => c.id === activeChannelId)) ??
    null;

  const activeClient = clientThreads.find((c) => c.clientId === activeClientId) ?? null;

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clientThreads;
    return clientThreads.filter((c) => c.fullName.toLowerCase().includes(q));
  }, [clientThreads, clientSearch]);

  const setTab = (next: MessagesTab) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    if (next === "clients") {
      p.delete("channel");
    } else {
      p.delete("client");
      p.delete("clientChannel");
      if (next === "direct" && directChannels[0]) p.set("channel", directChannels[0].id);
      if (next === "groups" && groupChannels[0]) p.set("channel", groupChannels[0].id);
    }
    setParams(p, { replace: true });
  };

  const selectClient = (clientId: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", "clients");
    p.set("client", clientId);
    p.set("clientChannel", clientChannel);
    setParams(p, { replace: true });
  };

  const selectChannel = (channelId: string, channelTab: "direct" | "groups") => {
    const p = new URLSearchParams(params);
    p.set("tab", channelTab);
    p.set("channel", channelId);
    p.delete("client");
    p.delete("clientChannel");
    setParams(p, { replace: true });
  };

  const setClientChannelTab = (next: ClientChannelTab) => {
    if (!activeClientId) return;
    const p = new URLSearchParams(params);
    p.set("clientChannel", next);
    setParams(p, { replace: true });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Messages"
        description="Client team threads, direct messages, and team channels"
        actions={
          tab !== "clients" ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpenNew("dm")}>
                <MessageSquare className="size-4 mr-1.5" />
                New DM
              </Button>
              <Button size="sm" onClick={() => setOpenNew("group")}>
                <Plus className="size-4 mr-1.5" />
                New group
              </Button>
            </div>
          ) : null
        }
      />

      <div className="px-6 pb-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as MessagesTab)}>
          <TabsList>
            <TabsTrigger value="clients" className="gap-1.5">
              <Briefcase className="size-3.5" />
              Client threads
            </TabsTrigger>
            <TabsTrigger value="direct" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-1.5">
              <Users className="size-3.5" />
              Groups
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-6 pt-2 grid md:grid-cols-[280px_1fr] gap-4">
        <Card className="overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
          <div className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b">
            {tab === "clients" ? "Clients" : tab === "groups" ? "Team channels" : "Direct messages"}
          </div>

          {tab === "clients" && (
            <div className="p-2 border-b">
              <Input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search clients…"
                className="h-8 text-sm"
              />
            </div>
          )}

          <div className="overflow-y-auto flex-1 divide-y">
            {tab === "clients" &&
              (filteredClients.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No client threads yet.</div>
              ) : (
                filteredClients.map((c) => (
                  <button
                    key={c.clientId}
                    type="button"
                    onClick={() => selectClient(c.clientId)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50",
                      activeClientId === c.clientId && "bg-muted",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Briefcase className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{c.fullName}</span>
                          {c.unread && (
                            <Badge variant="default" className="h-4 px-1 text-[10px]">
                              New
                            </Badge>
                          )}
                        </div>
                        {c.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ))}

            {tab === "direct" &&
              (directChannels.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No direct messages.</div>
              ) : (
                directChannels.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectChannel(c.id, "direct")}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50",
                      activeChannelId === c.id && "bg-muted",
                    )}
                  >
                    <MessageSquare className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{labelFor(c)}</span>
                  </button>
                ))
              ))}

            {tab === "groups" &&
              (groupChannels.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No team channels.</div>
              ) : (
                groupChannels.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectChannel(c.id, "groups")}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50",
                      activeChannelId === c.id && "bg-muted",
                    )}
                  >
                    <Users className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{labelFor(c)}</span>
                  </button>
                ))
              ))}
          </div>
        </Card>

        <div className="min-h-[420px]">
          {tab === "clients" && activeClientId && (
            <div className="space-y-3">
              <Tabs value={clientChannel} onValueChange={(v) => setClientChannelTab(v as ClientChannelTab)}>
                <TabsList>
                  <TabsTrigger value="internal" className="gap-1.5">
                    <Lock className="size-3.5" />
                    Team internal
                  </TabsTrigger>
                  <TabsTrigger value="portal" className="gap-1.5">
                    <MessageCircle className="size-3.5" />
                    With client
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {clientChannel === "internal" ? (
                <UnifiedChat
                  key={`${activeClientId}-internal`}
                  channelType="staff_internal"
                  clientId={activeClientId}
                  clientName={activeClient?.fullName ?? "Client"}
                  title={activeClient?.fullName ?? "Client"}
                />
              ) : (
                <UnifiedChat
                  key={`${activeClientId}-portal`}
                  channelType="staff_client"
                  clientId={activeClientId}
                  title={activeClient?.fullName ?? "Client"}
                />
              )}
            </div>
          )}

          {tab === "clients" && !activeClientId && (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              Select a client to open the team thread. All internal notes for that student stay in one place.
            </Card>
          )}

          {tab !== "clients" && activeChannel && (
            <UnifiedChat
              key={activeChannel.id}
              channelType={activeChannel.type}
              channelId={activeChannel.id}
              title={labelFor(activeChannel)}
            />
          )}

          {tab !== "clients" && !activeChannel && (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              Select or start a conversation.
            </Card>
          )}
        </div>
      </div>

      <NewChannelDialog
        kind={openNew}
        onClose={() => setOpenNew(null)}
        profiles={profiles.filter((p) => p.id !== user?.id)}
        onCreated={async (id, kind) => {
          await refreshChannels();
          selectChannel(id, kind === "team_group" ? "groups" : "direct");
        }}
      />
    </AppLayout>
  );
};

function NewChannelDialog({
  kind,
  onClose,
  profiles,
  onCreated,
}: {
  kind: "dm" | "group" | null;
  onClose: () => void;
  profiles: Profile[];
  onCreated: (id: string, kind: "direct" | "team_group") => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName("");
    setSelected([]);
  }, [kind]);

  const submit = async () => {
    setBusy(true);
    try {
      if (kind === "dm") {
        if (selected.length !== 1) {
          toast.error("Pick exactly one user");
          return;
        }
        const c = await createDM(selected[0]);
        onCreated(c.id, "direct");
      } else if (kind === "group") {
        if (!name.trim() || !selected.length) {
          toast.error("Name and at least one member required");
          return;
        }
        const c = await createGroup(name.trim(), selected);
        onCreated(c.id, "team_group");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "group" ? "New team channel" : "New direct message"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {kind === "group" && (
            <div className="space-y-1.5">
              <Label>Channel name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. All telecallers" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{kind === "dm" ? "Recipient" : "Members"}</Label>
            <div className="border rounded max-h-60 overflow-y-auto divide-y">
              {profiles.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No teammates available.</div>
              )}
              {profiles.map((p) => {
                const checked = selected.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (kind === "dm") setSelected(v ? [p.id] : []);
                        else setSelected((prev) => (v ? [...prev, p.id] : prev.filter((x) => x !== p.id)));
                      }}
                    />
                    <span className="text-sm">{p.full_name || p.email}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Messages;
