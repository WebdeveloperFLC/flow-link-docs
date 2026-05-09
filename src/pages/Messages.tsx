import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { listMyChannels, createDM, createGroup, type ChatChannel } from "@/lib/chat";
import { UnifiedChat } from "@/components/chat/UnifiedChat";
import { Plus, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Profile { id: string; full_name: string | null; email: string | null; }

const Messages = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<(ChatChannel & { members: string[] })[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [openNew, setOpenNew] = useState<null | "dm" | "group">(null);

  const refresh = async () => {
    const list = await listMyChannels();
    setChannels(list);
    if (!activeId && list.length) setActiveId(list[0].id);
  };

  useEffect(() => {
    refresh();
    supabase.from("profiles").select("id,full_name,email").then(({ data }) => setProfiles(data ?? []));
  }, []);

  // Realtime: refresh channel list on membership changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`channels:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_channel_members", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p.full_name || p.email || p.id.slice(0, 6)])), [profiles]);
  const labelFor = (c: ChatChannel & { members: string[] }) => {
    if (c.type === "team_group") return c.name || "Untitled group";
    const other = c.members.find((m) => m !== user?.id);
    return other ? (profileMap.get(other) ?? "Direct message") : "Direct message";
  };

  const active = channels.find((c) => c.id === activeId) ?? null;

  return (
    <AppLayout>
      <PageHeader
        title="Messages"
        description="Direct messages and team channels"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenNew("dm")}><MessageSquare className="size-4 mr-1.5" />New DM</Button>
            <Button size="sm" onClick={() => setOpenNew("group")}><Plus className="size-4 mr-1.5" />New group</Button>
          </div>
        }
      />
      <div className="p-6 grid md:grid-cols-[260px_1fr] gap-4">
        <Card className="overflow-hidden">
          <div className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b">Conversations</div>
          <div className="divide-y">
            {channels.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No conversations.</div>}
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 ${activeId === c.id ? "bg-muted" : ""}`}
              >
                {c.type === "team_group" ? <Users className="size-4 text-muted-foreground" /> : <MessageSquare className="size-4 text-muted-foreground" />}
                <span className="truncate">{labelFor(c)}</span>
              </button>
            ))}
          </div>
        </Card>
        <div>
          {active
            ? <UnifiedChat key={active.id} channelType={active.type} channelId={active.id} title={labelFor(active)} />
            : <Card className="p-12 text-center text-sm text-muted-foreground">Select or start a conversation.</Card>}
        </div>
      </div>

      <NewChannelDialog
        kind={openNew}
        onClose={() => setOpenNew(null)}
        profiles={profiles.filter((p) => p.id !== user?.id)}
        onCreated={async (id) => { await refresh(); setActiveId(id); }}
      />
    </AppLayout>
  );
};

function NewChannelDialog({ kind, onClose, profiles, onCreated }: {
  kind: "dm" | "group" | null;
  onClose: () => void;
  profiles: Profile[];
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(""); setSelected([]); }, [kind]);

  const submit = async () => {
    setBusy(true);
    try {
      if (kind === "dm") {
        if (selected.length !== 1) { toast.error("Pick exactly one user"); return; }
        const c = await createDM(selected[0]);
        onCreated(c.id);
      } else if (kind === "group") {
        if (!name.trim() || !selected.length) { toast.error("Name and at least one member required"); return; }
        const c = await createGroup(name.trim(), selected);
        onCreated(c.id);
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{kind === "group" ? "New team channel" : "New direct message"}</DialogTitle></DialogHeader>
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
              {profiles.length === 0 && <div className="p-3 text-sm text-muted-foreground">No teammates available.</div>}
              {profiles.map((p) => {
                const checked = selected.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (kind === "dm") setSelected(v ? [p.id] : []);
                        else setSelected((prev) => v ? [...prev, p.id] : prev.filter((x) => x !== p.id));
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Messages;
