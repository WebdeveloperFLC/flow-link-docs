import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateLead, type Lead, type LeadStatus } from "@/lib/leads";
import { LeadTemperatureBadge } from "./LeadBadges";
import { formatFollowupDue, followupDueState } from "@/lib/leadFollowup";
import { formatSupabaseError } from "@/lib/formatSupabaseError";

const PIPELINE_COLUMNS: Array<{ status: LeadStatus; label: string; tone: string }> = [
  { status: "new", label: "New", tone: "border-slate-200" },
  { status: "contacted", label: "Contacted", tone: "border-blue-200" },
  { status: "qualified", label: "Qualified", tone: "border-emerald-200" },
  { status: "unqualified", label: "Unqualified", tone: "border-amber-200" },
  { status: "lost", label: "Lost", tone: "border-rose-200" },
];

type Props = {
  leads: Lead[];
  ownerNames?: Record<string, string>;
  onChanged?: () => void;
};

export function LeadsKanbanBoard({ leads, ownerNames = {}, onChanged }: Props) {
  const [dragging, setDragging] = useState(false);

  const columns = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>();
    for (const col of PIPELINE_COLUMNS) map.set(col.status, []);
    for (const lead of leads) {
      if (lead.status === "converted") continue;
      const bucket = map.get(lead.status) ?? map.get("new")!;
      bucket.push(lead);
    }
    return PIPELINE_COLUMNS.map((col) => ({
      ...col,
      items: map.get(col.status) ?? [],
    }));
  }, [leads]);

  const onDragEnd = async (result: DropResult) => {
    setDragging(false);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const nextStatus = destination.droppableId as LeadStatus;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead || lead.status === nextStatus) return;

    if (nextStatus === "converted") {
      toast.message("To convert a lead, open it and use Register as Client", {
        description: "Leads can't be converted by dragging into this column.",
      });
      return;
    }

    try {
      await updateLead(lead.id, { status: nextStatus });
      toast.success(`Moved to ${PIPELINE_COLUMNS.find((c) => c.status === nextStatus)?.label ?? nextStatus}`);
      onChanged?.();
    } catch (e) {
      toast.error(formatSupabaseError(e, "Could not update stage"));
    }
  };

  return (
    <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={(r) => void onDragEnd(r)}>
      <div className="flex gap-3 overflow-x-auto pb-2 min-h-[420px]">
        {columns.map((col) => (
          <div key={col.status} className="w-[280px] shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary" className="text-[10px]">{col.items.length}</Badge>
            </div>
            <Droppable droppableId={col.status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex-1 rounded-lg border bg-muted/20 p-2 space-y-2 min-h-[360px]",
                    col.tone,
                    snapshot.isDraggingOver && "bg-primary/5 border-primary/30",
                  )}
                >
                  {col.items.map((lead, index) => {
                    const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
                    const overdue = followupDueState(lead.next_followup_at) === "overdue";
                    return (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <Card
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={cn(
                              "p-3 cursor-grab active:cursor-grabbing shadow-elev-sm space-y-2",
                              dragSnapshot.isDragging && "ring-2 ring-primary/40",
                              overdue && "border-destructive/40",
                            )}
                            onClick={() => nav(`/leads/${lead.id}`)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{name || lead.lead_number}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{lead.lead_number}</div>
                              </div>
                              <LeadTemperatureBadge value={lead.lead_temperature} />
                            </div>
                            {lead.next_followup_at && (
                              <div className={cn("text-[11px]", overdue && "text-destructive font-medium")}>
                                Next: {formatFollowupDue(lead.next_followup_at)}
                              </div>
                            )}
                            <div className="text-[11px] text-muted-foreground truncate">
                              {lead.assigned_counselor_id
                                ? ownerNames[lead.assigned_counselor_id] ?? "Assigned"
                                : "Unassigned"}
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
