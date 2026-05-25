import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, BellRing } from "lucide-react";
import { toast } from "sonner";

/**
 * Controls routing for automated transactional notifications (payment
 * received, receipt generated, etc.). These emails are sent server-side by
 * the notifications-dispatch edge function so they work for any employee
 * action, even when the actor has no accounting module access.
 */
export function NotificationRoutingCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountingInbox, setAccountingInbox] = useState("");
  const [bccAccounting, setBccAccounting] = useState(true);
  const [ccCounselor, setCcCounselor] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("notification_settings").select("*").eq("id", true).maybeSingle();
      if (data) {
        setAccountingInbox((data as any).accounting_inbox_email ?? "");
        setBccAccounting((data as any).bcc_accounting_inbox !== false);
        setCcCounselor((data as any).cc_assigned_counselor !== false);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (accountingInbox && !/^\S+@\S+\.\S+$/.test(accountingInbox)) {
      toast.error("Enter a valid accounting inbox email");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("notification_settings")
      .update({
        accounting_inbox_email: accountingInbox || null,
        bcc_accounting_inbox: bccAccounting,
        cc_assigned_counselor: ccCounselor,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", true);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notification routing saved");
  };

  return (
    <Card className="p-5 shadow-elev-sm space-y-4">
      <div className="flex items-center gap-2">
        <BellRing className="size-4 text-primary" />
        <h2 className="text-base font-semibold">Automated notification routing</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Controls who receives automated payment & receipt emails. These run server-side so they work for any employee
        action — including counselors and telecallers who do not have accounting access.
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Accounting inbox email</Label>
            <Input
              type="email"
              value={accountingInbox}
              onChange={(e) => setAccountingInbox(e.target.value)}
              placeholder="accounts@yourdomain.com"
            />
            <p className="text-xs text-muted-foreground">BCC'd on every automated receipt/payment email for audit.</p>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm">
              <div className="font-medium">BCC accounting inbox</div>
              <div className="text-xs text-muted-foreground">Send a hidden copy to the accounting inbox above.</div>
            </div>
            <Switch checked={bccAccounting} onCheckedChange={setBccAccounting} />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm">
              <div className="font-medium">CC the client's assigned counselor</div>
              <div className="text-xs text-muted-foreground">Loop in the counselor responsible for the client.</div>
            </div>
            <Switch checked={ccCounselor} onCheckedChange={setCcCounselor} />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving} className="gradient-brand text-primary-foreground">
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
              Save routing
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}