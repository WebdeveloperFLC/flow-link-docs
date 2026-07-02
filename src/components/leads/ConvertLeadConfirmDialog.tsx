import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { Lead } from "@/lib/leads";
import { countLeadServices } from "@/lib/convertLeadToClient";
import {
  formatClientDuplicateMessage,
  type ClientDuplicateMatch,
} from "@/lib/clientDuplicate";
import { formatBudgetRange } from "@/lib/currencyMaster";

export type ConvertLeadConfirmSummary = {
  lead: Lead;
  counselorName?: string | null;
  serviceLabels?: string[];
  duplicateMatches: ClientDuplicateMatch[];
};

type Props = {
  open: boolean;
  summary: ConvertLeadConfirmSummary | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (duplicateOverrideReason?: string) => void;
};

export function ConvertLeadConfirmDialog({
  open,
  summary,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const [overrideReason, setOverrideReason] = useState("");

  if (!summary) return null;

  const { lead, counselorName, serviceLabels, duplicateMatches } = summary;
  const name = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ");
  const contact = [
    lead.email,
    [lead.phone_country_code, lead.phone].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" · ");
  const serviceCount = countLeadServices(lead);
  const hasDuplicates = duplicateMatches.length > 0;

  const handleOpenChange = (next: boolean) => {
    if (!next && !busy) {
      setOverrideReason("");
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Register as client?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                This creates a client file and runs service enrollment and draft invoicing.
                This action cannot be undone from the lead screen.
              </p>

              <div className="rounded-md border bg-muted/40 p-3 text-foreground space-y-2">
                <p>
                  <span className="text-muted-foreground">Name:</span> {name || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Contact:</span> {contact || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Counselor:</span>{" "}
                  {counselorName?.trim() || "Unassigned"}
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Services:</span>
                  <Badge variant="secondary">{serviceCount} selected</Badge>
                </p>
                {serviceLabels && serviceLabels.length > 0 && (
                  <p className="text-xs text-muted-foreground">{serviceLabels.slice(0, 6).join(" · ")}</p>
                )}
                {lead.has_budget === "yes" && (
                  <p>
                    <span className="text-muted-foreground">Budget:</span>{" "}
                    {formatBudgetRange(
                      lead.budget_min ?? null,
                      lead.budget_max ?? null,
                      lead.budget_currency || "INR",
                    )}
                  </p>
                )}
              </div>

              {hasDuplicates && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2"
                >
                  <div className="flex items-start gap-2 text-destructive font-medium">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
                    Possible duplicate client
                  </div>
                  {duplicateMatches.map((match) => (
                    <div key={match.id} className="text-xs text-foreground space-y-1">
                      <p>{formatClientDuplicateMessage(match)}</p>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <Link to={`/clients/${match.id}`} onClick={() => !busy && onClose()}>
                          Open existing client
                        </Link>
                      </Button>
                    </div>
                  ))}
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="convert-duplicate-override">
                      Reason to register anyway (required if continuing)
                    </Label>
                    <Textarea
                      id="convert-duplicate-override"
                      rows={2}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Sibling applying separately; counselor confirmed distinct case"
                    />
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            disabled={busy || (hasDuplicates && !overrideReason.trim())}
            onClick={() => {
              onConfirm(hasDuplicates ? overrideReason.trim() : undefined);
              setOverrideReason("");
            }}
          >
            {busy ? "Registering…" : "Register as client"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
