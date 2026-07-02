import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
import { EmptyState } from "@/components/crm/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadStatusBadge, LeadTemperatureBadge } from "./LeadBadges";
import { LeadRowActionsMenu } from "./LeadRowActionsMenu";
import type { Lead, LeadSortKey } from "@/lib/leads";
import { formatFollowupDue, followupDueState } from "@/lib/leadFollowup";
import { cn } from "@/lib/utils";

function servicesSummary(l: Lead): string {
  const parts: string[] = [];
  if (l.coaching_services?.length) parts.push(`Coaching×${l.coaching_services.length}`);
  if (l.visa_services?.length) parts.push(`Visa×${l.visa_services.length}`);
  if (l.admission_services?.length) parts.push(`Admission×${l.admission_services.length}`);
  if (l.allied_services?.length) parts.push(`Allied×${l.allied_services.length}`);
  if (l.visa_locked) parts.push("Visa locked");
  return parts.join(" · ") || "—";
}

type SortState = { key: LeadSortKey; dir: "asc" | "desc" };

type Props = {
  leads: Lead[];
  showCampaign?: boolean;
  ownerNames?: Record<string, string>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  sort?: SortState;
  onSortChange?: (key: LeadSortKey) => void;
  onRefresh?: () => void;
};

function SortHeader({
  label,
  column,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  column: LeadSortKey;
  sort?: SortState;
  onSortChange?: (key: LeadSortKey) => void;
  className?: string;
}) {
  const active = sort?.key === column;
  const Icon = !active ? ArrowUpDown : sort?.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      className={cn("inline-flex items-center gap-1 hover:text-foreground", className)}
      onClick={() => onSortChange?.(column)}
    >
      {label}
      {onSortChange && <Icon className="size-3.5 opacity-60" aria-hidden />}
    </button>
  );
}

export function LeadsTable({
  leads,
  showCampaign = false,
  ownerNames = {},
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sort,
  onSortChange,
  onRefresh,
}: Props) {
  const nav = useNavigate();
  const selectable = !!selectedIds && !!onToggleSelect;
  const allSelected = selectable && leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  if (!leads.length) {
    return (
      <EmptyState
        icon={Users}
        title="No leads to show"
        description="No leads match the current search and filters. Try widening or clearing them."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(c) => onToggleSelectAll?.(!!c)}
                aria-label="Select all leads on page"
              />
            </TableHead>
          )}
          <TableHead className="w-[120px]">Lead #</TableHead>
          <TableHead>
            <SortHeader label="Name" column="last_name" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead>
            <SortHeader label="Temp" column="lead_temperature" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead>
            <SortHeader label="Status" column="status" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead>Services</TableHead>
          <TableHead>
            <SortHeader label="Next action" column="next_followup_at" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead>Primary User</TableHead>
          <TableHead>Branch / Dept</TableHead>
          {showCampaign && <TableHead>Campaign</TableHead>}
          <TableHead>
            <SortHeader label="Created" column="created_at" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((l) => {
          const overdue = followupDueState(l.next_followup_at) === "overdue";
          return (
            <TableRow
              key={l.id}
              className={cn("cursor-pointer", overdue && "bg-destructive/5")}
              onClick={() => nav(`/leads/${l.id}`)}
            >
              {selectable && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(l.id)}
                    onCheckedChange={() => onToggleSelect?.(l.id)}
                    aria-label={`Select ${l.lead_number}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-mono text-xs">{l.lead_number}</TableCell>
              <TableCell className="font-medium">
                {[l.first_name, l.middle_name, l.last_name].filter(Boolean).join(" ")}
                <div className="text-xs text-muted-foreground">{l.email || l.phone || "—"}</div>
              </TableCell>
              <TableCell><LeadTemperatureBadge value={l.lead_temperature} /></TableCell>
              <TableCell><LeadStatusBadge value={l.status} /></TableCell>
              <TableCell className="text-xs max-w-[180px] truncate">{servicesSummary(l)}</TableCell>
              <TableCell className={cn("text-xs", overdue && "text-destructive font-medium")}>
                {l.next_followup_at ? formatFollowupDue(l.next_followup_at) : "—"}
              </TableCell>
              <TableCell className="text-xs">
                {l.assigned_counselor_id ? ownerNames[l.assigned_counselor_id] ?? "…" : "Unassigned"}
              </TableCell>
              <TableCell className="text-xs">
                <div>{l.branch || "—"}</div>
                <div className="text-muted-foreground">{l.department || "—"}</div>
              </TableCell>
              {showCampaign && <TableCell className="text-xs">{l.cold_pool_campaign || "—"}</TableCell>}
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(l.created_at), "dd MMM yyyy")}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <LeadRowActionsMenu
                  lead={l}
                  onChanged={onRefresh}
                  onScheduleFollowup={(lead) => nav(`/leads/new?id=${lead.id}#followup`)}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export { servicesSummary };
