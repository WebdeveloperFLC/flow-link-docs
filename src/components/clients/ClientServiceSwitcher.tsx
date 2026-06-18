import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import {
  buildClientServiceEntries,
  collectClientServices,
  guessServiceCodeForPipeline,
  resolvePipelineForServiceCode,
  switchClientActiveService,
  type ClientServiceEntry,
} from "@/lib/clientActiveService";
import {
  collectUnresolvedLibraryIds,
  fetchServiceLibraryLabels,
  isUuidServiceCode,
} from "@/lib/service-library/resolveServiceLabel";
import { useServiceLabelMap } from "@/lib/service-library/useServiceLabelMap";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  clientId: string;
  clientCountry?: string | null;
  onSwitched?: () => void;
  /** Only list visa & immigration services (for staging bar). */
  visaOnly?: boolean;
  /** card = Stage & Setup pills; compact = header dropdown. */
  variant?: "card" | "compact";
};

export function ClientServiceSwitcher({
  clientId,
  clientCountry,
  onSwitched,
  visaOnly = false,
  variant = "card",
}: Props) {
  const [params, setParams] = useSearchParams();
  const [services, setServices] = useState<ClientServiceEntry[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [prefetchedLabels, setPrefetchedLabels] = useState<Record<string, string>>({});
  const [activeCode, setActiveCode] = useState<string | null>(params.get("service"));
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, clientRes] = await Promise.all([
        fetchAllServiceCatalogue().catch(() => [] as ServiceCatalogueItem[]),
        supabase
          .from("clients")
          .select(
            "visa_services, coaching_services, admission_services, allied_services, travel_financial_services, pipeline_id",
          )
          .eq("id", clientId)
          .maybeSingle(),
      ]);
      setCatalogue(cat);

      const codes = collectClientServices(clientRes.data ?? {});
      setServiceCodes(codes);

      const missing = collectUnresolvedLibraryIds(codes, cat);
      const labelMap =
        missing.length > 0 ? await fetchServiceLibraryLabels(missing).catch(() => new Map<string, string>()) : new Map<string, string>();
      setPrefetchedLabels(Object.fromEntries(labelMap));

      const entries = buildClientServiceEntries(codes, cat, labelMap);
      setServices(entries);

      const visaEntries = entries.filter((e) => e.category === "visa");
      const pool = visaOnly ? visaEntries : entries;

      if (pool.length === 0) {
        setActiveCode(null);
        return;
      }

      if (pool.length === 1) {
        setActiveCode(pool[0]!.code);
        return;
      }

      const urlCode = params.get("service");
      let targetCode: string | null = null;
      if (urlCode && pool.some((e) => e.code === urlCode)) {
        targetCode = urlCode;
      } else if (visaOnly) {
        targetCode = visaEntries[0]?.code ?? null;
      } else {
        targetCode = await guessServiceCodeForPipeline(
          clientRes.data?.pipeline_id,
          codes,
          cat,
          clientCountry,
        );
      }
      setActiveCode(targetCode);

      if (targetCode && params.get("service")) {
        const entry = entries.find((e) => e.code === targetCode);
        if (entry?.category === "visa") {
          const expected = await resolvePipelineForServiceCode(targetCode, cat, clientCountry);
          const currentPipeline = clientRes.data?.pipeline_id ?? null;
          if (expected && expected.pipelineId !== currentPipeline) {
            const switched = await switchClientActiveService({
              clientId,
              serviceCode: targetCode,
              catalogue: cat,
              clientCountry,
            });
            if (switched) onSwitched?.();
          }
        }
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once per client/URL service param
  }, [clientId, clientCountry, params.get("service"), visaOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const labelMap = useServiceLabelMap(serviceCodes, catalogue);
  const mergedLabelMap = useMemo(() => {
    const map = new Map(labelMap);
    for (const [id, label] of Object.entries(prefetchedLabels)) {
      if (label) map.set(id, label);
    }
    return map;
  }, [labelMap, prefetchedLabels]);

  const displayServices = useMemo(() => {
    const mapped = services.map((s) => {
      const label = mergedLabelMap.get(s.code) ?? s.label;
      const labelPending = isUuidServiceCode(s.code) && label.trim() === s.code.trim();
      return {
        ...s,
        label: labelPending ? "Loading…" : label,
        labelPending,
      };
    });
    return visaOnly ? mapped.filter((s) => s.category === "visa") : mapped;
  }, [services, mergedLabelMap, visaOnly]);

  const showSwitcher = displayServices.length > 1;

  const onSelect = async (code: string) => {
    if (code === activeCode || switching) return;
    const entry = services.find((s) => s.code === code);
    if (entry && entry.category !== "visa") {
      setActiveCode(code);
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.set("service", code);
        return next;
      }, { replace: true });
      return;
    }
    setSwitching(code);
    try {
      const ok = await switchClientActiveService({
        clientId,
        serviceCode: code,
        catalogue,
        clientCountry,
      });
      if (!ok) {
        toast.error("No matching pipeline for this service — assign a workflow template first");
        setActiveCode(code);
        setParams((p) => {
          const next = new URLSearchParams(p);
          next.set("service", code);
          return next;
        }, { replace: true });
        return;
      }
      setActiveCode(code);
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.set("service", code);
        return next;
      }, { replace: true });
      onSwitched?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not switch service");
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    if (variant === "compact") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
        </span>
      );
    }
    return null;
  }

  if (displayServices.length === 0) return null;

  if (variant === "compact") {
    if (!showSwitcher) {
      const only = displayServices[0];
      if (!only) return null;
      return (
        <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
          {only.label}
        </span>
      );
    }
    return (
      <Select
        value={activeCode ?? undefined}
        onValueChange={(v) => void onSelect(v)}
        disabled={!!switching}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-auto min-w-[10rem] max-w-[14rem] sm:max-w-xs text-xs font-medium border-primary/30 bg-primary/5",
            switching && "opacity-60",
          )}
        >
          {switching ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin mr-1" />
          ) : null}
          <SelectValue placeholder="Visa service" />
        </SelectTrigger>
        <SelectContent align="end">
          {displayServices.map((s) => (
            <SelectItem key={s.code} value={s.code} className="text-sm">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (!showSwitcher) return null;

  return (
    <div className="px-4 sm:px-8 pt-3 border-b bg-muted/20">
      <div className="rounded-xl border bg-card p-2 shadow-elev-sm">
      <div className="px-2 pt-1 pb-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {visaOnly ? "Visa application" : "Active application"}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {visaOnly
            ? `${displayServices.length} visa service${displayServices.length === 1 ? "" : "s"} — select one to view stage progress`
            : `${displayServices.length} services — select one to view its stage progress`}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
        {displayServices.map((s) => {
          const isActive = s.code === activeCode;
          const busy = switching === s.code;
          return (
            <button
              key={s.code}
              type="button"
              disabled={!!switching}
              onClick={() => void onSelect(s.code)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors max-w-full",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground",
                switching && !busy && "opacity-60",
              )}
            >
              {busy && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
              <span className="truncate">
                {s.labelPending ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Loading…
                  </span>
                ) : (
                  s.label
                )}
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
