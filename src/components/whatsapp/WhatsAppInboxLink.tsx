import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildWhatsAppInboxUrl, findConversationForContact, isWhatsAppInboxEnabled } from "@/lib/whatsapp/api";

type Props = {
  phone?: string | null;
  leadId?: string | null;
  clientId?: string | null;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost";
  className?: string;
};

export function WhatsAppInboxLink({
  phone,
  leadId,
  clientId,
  size = "sm",
  variant = "outline",
  className,
}: Props) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!isWhatsAppInboxEnabled()) return null;
  if (!phone?.trim() && !leadId && !clientId) return null;

  const open = async () => {
    setBusy(true);
    try {
      const conv = await findConversationForContact({ phone, leadId, clientId });
      if (!conv) {
        toast.info("No helpline WhatsApp thread yet for this contact");
        return;
      }
      nav(buildWhatsAppInboxUrl(conv.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not open WhatsApp thread");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={busy}
      onClick={open}
    >
      <MessageCircle className="size-3.5 mr-1" />
      WhatsApp inbox
    </Button>
  );
}
