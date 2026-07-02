import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Flame, Thermometer, UserPlus, CalendarClock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateLead, type Lead } from "@/lib/leads";
import { formatSupabaseError } from "@/lib/formatSupabaseError";

type Props = {
  lead: Lead;
  onChanged?: () => void;
  onScheduleFollowup?: (lead: Lead) => void;
};

export function LeadRowActionsMenu({ lead, onChanged, onScheduleFollowup }: Props) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const patch = async (data: Parameters<typeof updateLead>[1], message: string) => {
    setBusy(true);
    try {
      await updateLead(lead.id, data);
      toast.success(message);
      onChanged?.();
    } catch (e) {
      toast.error(formatSupabaseError(e, "Action failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={busy}
          aria-label={`Actions for lead ${lead.lead_number}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => nav(`/leads/${lead.id}`)}>View details</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav(`/leads/new?id=${lead.id}`)}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={lead.lead_temperature === "hot" || lead.status === "converted"}
          onClick={() => void patch({ lead_temperature: "hot" }, "Marked hot")}
        >
          <Flame className="size-4 mr-2" /> Mark hot
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={lead.lead_temperature === "warm" || lead.status === "converted"}
          onClick={() => void patch({ lead_temperature: "warm" }, "Marked warm")}
        >
          <Thermometer className="size-4 mr-2" /> Mark warm
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onScheduleFollowup?.(lead)}>
          <CalendarClock className="size-4 mr-2" /> Schedule follow-up
        </DropdownMenuItem>
        {lead.status !== "converted" && (
          <DropdownMenuItem onClick={() => nav(`/leads/new?id=${lead.id}&register_client=1`)}>
            <UserPlus className="size-4 mr-2" /> Register as client
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
