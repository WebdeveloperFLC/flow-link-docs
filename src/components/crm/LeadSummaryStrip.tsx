import { useState } from "react";
import { ChevronDown, Mail, MapPin, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { LeadFieldSnapshot } from "@/components/crm/ClientRegistrationPanel";

type Props = {
  leadNumber: string;
  clientRegNumber?: string | null;
  fields: LeadFieldSnapshot;
  notes?: string;
  children?: React.ReactNode;
};

export function LeadSummaryStrip({ leadNumber, clientRegNumber, fields, notes, children }: Props) {
  const [open, setOpen] = useState(false);
  const name = [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ");
  const phone = [fields.phone_country_code, fields.phone].filter(Boolean).join(" ");
  const serviceCount =
    (fields.coaching_services?.length ?? 0) +
    (fields.visa_services?.length ?? 0) +
    (fields.admission_services?.length ?? 0) +
    (fields.allied_services?.length ?? 0) +
    (fields.travel_services?.length ?? 0);
  const countries = fields.interested_countries?.slice(0, 2).join(", ");

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card shadow-elev-sm overflow-hidden">
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{name || "Unnamed lead"}</div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
              <span className="font-mono">Lead {leadNumber}</span>
              {clientRegNumber && (
                <>
                  <span>·</span>
                  <span className="font-mono text-primary">Client {clientRegNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5 shrink-0" />
              {phone}
            </span>
          )}
          {fields.email && (
            <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
              <Mail className="size-3.5 shrink-0" />
              {fields.email}
            </span>
          )}
          {(countries || fields.branch) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              {[countries, fields.branch].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 ml-auto">
          {serviceCount > 0 && (
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-xs">
              {serviceCount} service{serviceCount === 1 ? "" : "s"}
            </Badge>
          )}
          {fields.department && (
            <Badge variant="secondary" className="text-xs">
              {fields.department}
            </Badge>
          )}
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 border-t px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
          {open ? "Hide lead details" : "Edit lead details"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-muted/20 p-4 space-y-4">
            {notes && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Lead notes</div>
                <p className="text-sm whitespace-pre-wrap rounded-md border bg-background p-3">{notes}</p>
              </div>
            )}
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
