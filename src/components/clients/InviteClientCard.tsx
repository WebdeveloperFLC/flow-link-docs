import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Copy, Loader2, X, Send, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Invite { id: string; email: string; expires_at: string; used_at: string|null; revoked_at: string|null; created_at: string }

export function InviteClientCard({ clientId, defaultEmail }: { clientId: string; defaultEmail?: string|null }) {
  const { hasRole } = useAuth();
  const canInvite = hasRole(["admin", "counselor", "telecaller"]);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [linked, setLinked] = useState<{ user_id: string }[]>([]);

  const load = async () => {
    const [{ data: inv }, { data: lk }] = await Promise.all([
      supabase.from("client_portal_invites")
        .select("id,email,expires_at,used_at,revoked_at,created_at")
        .eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_portal_links").select("user_id").eq("client_id", clientId),
    ]);
    setInvites((inv ?? []) as Invite[]);
    setLinked(lk ?? []);
  };
  useEffect(() => { load(); }, [clientId]);
  useEffect(() => { if (defaultEmail && !email) setEmail(defaultEmail); }, [defaultEmail]);

  const send = async () => {
    if (!email.trim()) { toast.error("Enter an email"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("client-portal-invite-create", {
      body: { clientId, email: email.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error ?? error?.message ?? "Failed"); return; }
    const link = (data as any).link as string;
    const emailed = (data as any).emailed as boolean;
    await navigator.clipboard.writeText(link).catch(() => undefined);
    toast.success(emailed ? "Invite sent by email — link copied to clipboard" : "Invite link copied — paste it to the client");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("client_portal_invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Revoked"); load(); }
  };

  const copyLink = async (inviteId: string) => {
    const { data: token, error } = await supabase.rpc("get_portal_invite_token", { _invite_id: inviteId });
    if (error || !token) { toast.error(error?.message ?? "Only the inviter or an admin can copy this link"); return; }
    const link = `${window.location.origin}/portal/invite?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  if (!canInvite) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="size-4 text-primary"/>
        <h3 className="font-semibold">Client portal access</h3>
      </div>
      {linked.length > 0 && (
        <div className="text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <UserCheck className="size-3"/> Linked to {linked.length} portal account(s)
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-xs">Email</Label>
        <div className="flex gap-2">
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="client@example.com"/>
          <Button onClick={send} disabled={busy} size="sm">
            {busy ? <Loader2 className="size-4 animate-spin"/> : <><Send className="size-4 mr-1"/>Invite</>}
          </Button>
        </div>
      </div>
      {invites.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-medium text-muted-foreground">History</div>
          {invites.map((inv) => {
            const status = inv.used_at ? "used" : inv.revoked_at ? "revoked" : new Date(inv.expires_at) < new Date() ? "expired" : "pending";
            return (
              <div key={inv.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{inv.email}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                  status === "used" ? "bg-emerald-100 text-emerald-700" :
                  status === "pending" ? "bg-amber-100 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>{status}</span>
                {status === "pending" && (
                  <>
                    <Button size="icon" variant="ghost" className="size-6" onClick={()=>copyLink(inv.id)}><Copy className="size-3"/></Button>
                    <Button size="icon" variant="ghost" className="size-6" onClick={()=>revoke(inv.id)}><X className="size-3"/></Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}