import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Mail, MapPin, Briefcase, FileText, ArrowRightLeft, History } from "lucide-react";
import { CallClientButton } from "@/components/clients/CallClientButton";
import { AddRemarkDialog } from "@/components/clients/AddRemarkDialog";
import { HandoffDialog } from "@/components/clients/HandoffDialog";
import { ClientTimelineCard } from "@/components/clients/ClientTimelineCard";
import { Link } from "react-router-dom";
import { applyContactMask } from "@/lib/masking";
import { queueContactFromItem, type QueueItemWithClient } from "@/lib/telecallerQueue";
import { StatusBadge, leadStatusVariant } from "@/components/ui/status-badge";

export function CallDrawer({ item, mask, open, onOpenChange, onChanged }: {
  item: QueueItemWithClient | null;
  mask: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged?: () => void;
}) {
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);

  if (!item) return null;
  const contact = queueContactFromItem(item);
  const masked = applyContactMask({ phone: contact.phone, email: contact.email, mask });
  const detailPath = contact.kind === "client" ? `/clients/${contact.id}` : `/leads/${contact.id}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-3">
            {contact.full_name}
            {item.lead_status && (
              <StatusBadge variant={leadStatusVariant(item.lead_status)} className="border">
                {item.lead_status}
              </StatusBadge>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <Card className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> <span className="font-mono">{masked.phone || "—"}</span></div>
            <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> {masked.email || "—"}</div>
            <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /> {contact.country}</div>
            <div className="flex items-center gap-2"><Briefcase className="size-4 text-muted-foreground" /> {contact.application_type}</div>
            {item.notes && (
              <div className="flex items-start gap-2 text-muted-foreground"><FileText className="size-4 mt-0.5" /> <span className="text-xs">{item.notes}</span></div>
            )}
          </Card>

          <div className="flex flex-wrap gap-2">
            {contact.kind === "client" && <CallClientButton clientId={contact.id} />}
            <Button variant="outline" size="sm" onClick={() => setRemarkOpen(true)}>
              <FileText className="size-4 mr-1.5" />Add remark
            </Button>
            {contact.kind === "client" && (
              <Button variant="outline" size="sm" onClick={() => setHandoffOpen(true)}>
                <ArrowRightLeft className="size-4 mr-1.5" />Push to counselor
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={detailPath}>
                <History className="size-4 mr-1.5" />
                {contact.kind === "client" ? "Open client" : "Open lead"}
              </Link>
            </Button>
          </div>

          {contact.kind === "client" && <ClientTimelineCard clientId={contact.id} />}
        </div>
        <AddRemarkDialog
          open={remarkOpen}
          onOpenChange={setRemarkOpen}
          clientId={contact.kind === "client" ? contact.id : undefined}
          leadId={contact.kind === "lead" ? contact.id : undefined}
          queueItemId={item.id}
          onSaved={onChanged}
        />
        {contact.kind === "client" && (
          <HandoffDialog open={handoffOpen} onOpenChange={setHandoffOpen} clientId={contact.id} clientName={contact.full_name} />
        )}
      </SheetContent>
    </Sheet>
  );
}
