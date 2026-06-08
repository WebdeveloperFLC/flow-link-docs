import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addClientChatMember,
  listClientTeamMembers,
  removeClientChatMember,
  type ClientTeamMember,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, UserPlus, Users, X } from "lucide-react";

interface StaffProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  clientId: string;
  clientName?: string;
  filterMemberId: string;
  onFilterMemberIdChange: (value: string) => void;
  onMention: (member: ClientTeamMember) => void;
  onMembersChange?: (members: ClientTeamMember[]) => void;
}

export function ClientChatTeamPanel({
  clientId,
  clientName,
  filterMemberId,
  onFilterMemberIdChange,
  onMention,
  onMembersChange,
}: Props) {
  const { user, isAdmin } = useAuth();
  const [teamMembers, setTeamMembers] = useState<ClientTeamMember[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ClientTeamMember | null>(null);

  const isPrimary =
    !!user && (user.id === ownerId || (!ownerId && !!createdBy && user.id === createdBy));
  const canManage = isAdmin || isPrimary;

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: cli }, members] = await Promise.all([
      supabase.from("clients").select("owner_id,created_by").eq("id", clientId).maybeSingle(),
      listClientTeamMembers(clientId),
    ]);
    setOwnerId(cli?.owner_id ?? null);
    setCreatedBy(cli?.created_by ?? null);
    setTeamMembers(members);
    onMembersChange?.(members);
    setLoading(false);
  }, [clientId, onMembersChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!addOpen) return;
    supabase.rpc("list_assignable_staff").then(({ data }) => {
      setStaff(
        ((data ?? []) as StaffProfile[]).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
        })),
      );
    });
  }, [addOpen]);

  const memberIds = useMemo(() => new Set(teamMembers.map((m) => m.id)), [teamMembers]);

  const addCandidates = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staff
      .filter((p) => !memberIds.has(p.id))
      .filter((p) => {
        if (!q) return true;
        const label = `${p.full_name ?? ""} ${p.email ?? ""}`.toLowerCase();
        return label.includes(q);
      })
      .slice(0, 12);
  }, [staff, memberIds, staffSearch]);

  const addMember = async () => {
    if (!selectedUserId) return;
    setBusy(true);
    try {
      await addClientChatMember(clientId, selectedUserId, clientName);
      toast.success("Team member added to internal chat");
      setAddOpen(false);
      setSelectedUserId("");
      setStaffSearch("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add team member");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await removeClientChatMember(clientId, removeTarget);
      toast.success("Team member removed from internal chat");
      if (filterMemberId === removeTarget.id) onFilterMemberIdChange("all");
      setRemoveTarget(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove team member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="px-3 py-2 border-b bg-muted/20 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
            Team on file
          </span>
          <Select value={filterMemberId} onValueChange={onFilterMemberIdChange}>
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue placeholder="All team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team messages</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name || m.email || m.id.slice(0, 6)}
                  {m.role !== "Team" ? ` · ${m.role}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs ml-auto"
              onClick={() => setAddOpen(true)}
            >
              <UserPlus className="size-3 mr-1" />
              Add member
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-1">
            <Loader2 className="size-3 animate-spin" />
            Loading team…
          </div>
        ) : teamMembers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No team members on this client file yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {teamMembers.map((m) => {
              const label = m.full_name || m.email || m.id.slice(0, 6);
              const isMe = m.id === user?.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full border pl-2 pr-1 py-0.5 text-[11px]",
                    filterMemberId === m.id && "border-primary bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onMention(m)}
                    className="inline-flex items-center gap-1 hover:opacity-80"
                    title={`Mention ${label} in a note`}
                  >
                    <Users className="size-3 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[120px]">{label}</span>
                    {m.role !== "Team" && (
                      <Badge variant="secondary" className="h-4 px-1 text-[9px] font-normal">
                        {m.role}
                      </Badge>
                    )}
                    {isMe && <span className="text-muted-foreground">(you)</span>}
                  </button>
                  {canManage && m.removable && (
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                      title={`Remove ${label} from internal chat`}
                      onClick={() => setRemoveTarget(m)}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Shared internal thread — add colleagues who need visibility, click a member to @mention, or filter notes by
          author. Removing someone revokes their view access to this client file.
        </p>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Grant view access so they can read and participate in this client&apos;s internal thread.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search staff by name or email…"
              className="h-9"
            />
            <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
              {addCandidates.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">No staff found to add.</p>
              ) : (
                addCandidates.map((p) => {
                  const label = p.full_name || p.email || p.id.slice(0, 6);
                  const selected = selectedUserId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedUserId(p.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-muted/60",
                        selected && "bg-primary/5",
                      )}
                    >
                      <div className="font-medium">{label}</div>
                      {p.email && p.full_name && (
                        <div className="text-[11px] text-muted-foreground truncate">{p.email}</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={addMember} disabled={!selectedUserId || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Add to chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from internal chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.full_name || removeTarget?.email || "This user"} will lose view access to this client file
              and no longer see internal notes or notifications for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={busy}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
