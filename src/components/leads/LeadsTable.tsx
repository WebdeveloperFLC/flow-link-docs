import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadStatusBadge, LeadTemperatureBadge } from "./LeadBadges";
import type { Lead } from "@/lib/leads";

function servicesSummary(l: Lead): string {
  const parts: string[] = [];
  if (l.coaching_services?.length) parts.push(`Coaching×${l.coaching_services.length}`);
  if (l.visa_services?.length) parts.push(`Visa×${l.visa_services.length}`);
  if (l.admission_services?.length) parts.push(`Admission×${l.admission_services.length}`);
  if (l.allied_services?.length) parts.push(`Allied×${l.allied_services.length}`);
  if (l.visa_locked) parts.push("🔒 Visa");
  return parts.join(" · ") || "—";
}

export const LeadsTable = ({
  leads,
  showCampaign = false,
  ownerNames = {},
}: {
  leads: Lead[];
  showCampaign?: boolean;
  ownerNames?: Record<string, string>;
}) => {
  const nav = useNavigate();
  if (!leads.length) {
    return <div className="p-12 text-center text-muted-foreground text-sm">No leads found.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[140px]">Lead #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Temp</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Services</TableHead>
          <TableHead>Primary User</TableHead>
          <TableHead>Branch / Dept</TableHead>
          {showCampaign && <TableHead>Campaign</TableHead>}
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((l) => (
          <TableRow key={l.id} className="cursor-pointer" onClick={() => nav(`/leads/${l.id}`)}>
            <TableCell className="font-mono text-xs">{l.lead_number}</TableCell>
            <TableCell className="font-medium">
              {[l.first_name, l.middle_name, l.last_name].filter(Boolean).join(" ")}
              <div className="text-xs text-muted-foreground">{l.email || l.phone || "—"}</div>
            </TableCell>
            <TableCell><LeadTemperatureBadge value={l.lead_temperature} /></TableCell>
            <TableCell><LeadStatusBadge value={l.status} /></TableCell>
            <TableCell className="text-xs">{servicesSummary(l)}</TableCell>
            <TableCell className="text-xs">
              {l.assigned_counselor_id
                ? ownerNames[l.assigned_counselor_id] ?? "…"
                : "—"}
            </TableCell>
            <TableCell className="text-xs">
              <div>{l.branch || "—"}</div>
              <div className="text-muted-foreground">{l.department || "—"}</div>
            </TableCell>
            {showCampaign && <TableCell className="text-xs">{l.cold_pool_campaign || "—"}</TableCell>}
            <TableCell className="text-xs text-muted-foreground">
              {format(new Date(l.created_at), "dd MMM yyyy")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};