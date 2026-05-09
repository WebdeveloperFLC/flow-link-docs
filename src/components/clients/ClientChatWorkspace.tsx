import { UnifiedChat } from "@/components/chat/UnifiedChat";

export function ClientChatWorkspace({ clientId }: { clientId: string }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <UnifiedChat channelType="staff_internal" clientId={clientId} />
      <UnifiedChat channelType="staff_client" clientId={clientId} />
    </div>
  );
}
