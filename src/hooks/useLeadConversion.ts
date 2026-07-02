import { useCallback, useState } from "react";
import type { Lead } from "@/lib/leads";
import {
  convertLeadToClient,
  type ConvertLeadOptions,
  type ConvertLeadResult,
} from "@/lib/convertLeadToClient";
import { findDuplicateClients, type ClientDuplicateMatch } from "@/lib/clientDuplicate";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { toast } from "sonner";
import type { ConvertLeadConfirmSummary } from "@/components/leads/ConvertLeadConfirmDialog";

export type LeadConversionNavigateTarget = {
  clientId: string;
  href: string;
};

type UseLeadConversionOptions = {
  resolveClientHref: (clientId: string) => string;
  onNavigate: (target: LeadConversionNavigateTarget) => void;
  resolveCounselorName?: (lead: Lead) => string | null;
  resolveServiceLabels?: (lead: Lead) => string[];
};

export function useLeadConversion({
  resolveClientHref,
  onNavigate,
  resolveCounselorName,
  resolveServiceLabels,
}: UseLeadConversionOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmSummary, setConfirmSummary] = useState<ConvertLeadConfirmSummary | null>(null);
  const [pendingLead, setPendingLead] = useState<Lead | null>(null);
  const [pendingOpts, setPendingOpts] = useState<ConvertLeadOptions>({});
  const [conversionResult, setConversionResult] = useState<ConvertLeadResult | null>(null);
  const [clientHref, setClientHref] = useState("");

  const closeConfirm = useCallback(() => {
    if (converting) return;
    setConfirmOpen(false);
    setConfirmSummary(null);
    setPendingLead(null);
    setPendingOpts({});
  }, [converting]);

  const closeResult = useCallback(() => {
    setResultOpen(false);
    if (conversionResult) {
      onNavigate({
        clientId: conversionResult.clientId,
        href: clientHref || resolveClientHref(conversionResult.clientId),
      });
    }
    setConversionResult(null);
    setClientHref("");
  }, [clientHref, conversionResult, onNavigate, resolveClientHref]);

  const requestConversion = useCallback(
    async (lead: Lead, opts: ConvertLeadOptions = {}) => {
      if (lead.converted_to_client_id) {
        onNavigate({
          clientId: lead.converted_to_client_id,
          href: resolveClientHref(lead.converted_to_client_id),
        });
        return;
      }

      let duplicateMatches: ClientDuplicateMatch[] = [];
      try {
        duplicateMatches = await findDuplicateClients({
          email: lead.email,
          phone: lead.phone,
        });
      } catch (e) {
        console.warn("[useLeadConversion] duplicate lookup failed", e);
      }

      setPendingLead(lead);
      setPendingOpts(opts);
      setConfirmSummary({
        lead,
        counselorName: resolveCounselorName?.(lead) ?? null,
        serviceLabels: resolveServiceLabels?.(lead) ?? [],
        duplicateMatches,
      });
      setConfirmOpen(true);
    },
    [onNavigate, resolveClientHref, resolveCounselorName, resolveServiceLabels],
  );

  const confirmConversion = useCallback(
    async (_duplicateOverrideReason?: string) => {
      if (!pendingLead) return;
      setConverting(true);
      try {
        const result = await convertLeadToClient(pendingLead, pendingOpts);
        const href = resolveClientHref(result.clientId);
        setClientHref(href);
        setConversionResult(result);
        setConfirmOpen(false);
        setConfirmSummary(null);
        setPendingLead(null);
        setPendingOpts({});
        setResultOpen(true);

        if (!result.alreadyConverted && !result.steps.some((s) => s.status === "failed")) {
          toast.success("Client file created");
        }
      } catch (e: unknown) {
        toast.error(formatSupabaseError(e, "Conversion failed"));
      } finally {
        setConverting(false);
      }
    },
    [pendingLead, pendingOpts, resolveClientHref],
  );

  return {
    confirmOpen,
    resultOpen,
    converting,
    confirmSummary,
    conversionResult,
    clientHref: clientHref || (conversionResult ? resolveClientHref(conversionResult.clientId) : ""),
    requestConversion,
    confirmConversion,
    closeConfirm,
    closeResult,
    setConversionResult,
  };
}
