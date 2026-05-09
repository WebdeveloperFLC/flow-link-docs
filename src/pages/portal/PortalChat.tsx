import { PortalLayout } from "@/components/portal/PortalLayout";
import { UnifiedChat } from "@/components/chat/UnifiedChat";
import { Card } from "@/components/ui/card";
export default function PortalChat() {
  return <PortalLayout render={({ clientId }) => clientId ? (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Chat with your team</h1>
        <p className="text-sm text-muted-foreground">Visible to your counselor and support team.</p></div>
      <UnifiedChat channelType="staff_client" clientId={clientId} title="Chat with your counselor"/>
    </div>
  ) : <Card className="p-6">Account not linked yet.</Card>}/>;
}
