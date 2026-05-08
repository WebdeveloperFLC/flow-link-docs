import { useBrowserPhone } from "@/contexts/BrowserPhoneContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, LogOut, PhoneCall, PhoneOff, TestTube2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  logged_out: { label: "Logged out", tone: "outline" },
  logging_in: { label: "Logging in…", tone: "secondary" },
  ready: { label: "Ready", tone: "default" },
  dialing: { label: "Dialing…", tone: "secondary" },
  ringing: { label: "Ringing…", tone: "secondary" },
  connected: { label: "Connected", tone: "default" },
  ended: { label: "Ended", tone: "outline" },
  failed: { label: "Failed", tone: "destructive" },
};

export function BrowserPhonePanel() {
  const { status, statusDetail, callId, isAdmin, testExtension, login, logout, hangup, testCall } = useBrowserPhone();

  const onLogin = async () => {
    try { await login(); toast.success("Connected to TeleCMI SBC"); }
    catch (e: any) { toast.error(e?.message ?? "Login failed"); }
  };

  const onTest = () => {
    try { testCall(); toast.message("Test call placed"); }
    catch (e: any) { toast.error(e?.message ?? "Test call failed"); }
  };

  const meta = STATUS_LABEL[status] ?? STATUS_LABEL.logged_out;
  const isBusy = status === "logging_in" || status === "dialing" || status === "ringing" || status === "connected";
  const canCall = status === "ready" || status === "ended";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium flex items-center gap-2">
            Browser Calling
            <Badge variant={meta.tone}>{meta.label}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {status === "logged_out"
              ? "Sign in to TeleCMI to enable in-browser calls."
              : statusDetail
              ? `Detail: ${statusDetail}`
              : callId
              ? `Call ID: ${callId}`
              : "Session active."}
          </div>
        </div>
        <div className="flex gap-2">
          {status === "logged_out" || status === "failed" ? (
            <Button size="sm" onClick={onLogin} disabled={status === "logging_in" as any}>
              {status === "logging_in" as any ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
              Connect
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={logout} disabled={isBusy}>
              <LogOut className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          )}
          {isAdmin && testExtension && canCall && (
            <Button size="sm" variant="secondary" onClick={onTest}>
              <TestTube2 className="h-4 w-4 mr-1" />
              Test call
            </Button>
          )}
          {(status === "dialing" || status === "ringing" || status === "connected") && (
            <Button size="sm" variant="destructive" onClick={hangup}>
              <PhoneOff className="h-4 w-4 mr-1" />
              Hang up
            </Button>
          )}
        </div>
      </div>
      {status === "ready" && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <PhoneCall className="h-3.5 w-3.5" /> Ready — Dial buttons will use browser SDK.
        </div>
      )}
    </Card>
  );
}