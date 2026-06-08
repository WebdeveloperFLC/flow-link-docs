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
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  clientId: string;
  clientCountry?: string | null;
  onSwitched?: () => void;
};

export function ClientServiceSwitcher({ clientId, clientCountry, onSwitched }: Props) {
  const [params, setParams] = useSearchParams();
  const [services, setServices] = useState<ClientServiceEntry[]>([]);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
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
      const entries = buildClientServiceEntries(codes, cat);
      setServices(entries);

      if (entries.length <= 1) {
        setActiveCode(entries[0]?.code ?? null);
        return;
      }

      const urlCode = params.get("service");
      let targetCode: string | null = null;
      if (urlCode && codes.includes(urlCode)) {
        targetCode = urlCode;
      } else {
        targetCode = await guessServiceCodeForPipeline(
          clientRes.data?.pipeline_id,
          codes,
          cat,
          clientCountry,
        );
      }
      setActiveCode(targetCode);

      // If current pipeline doesn't match the active service, sync it.
      if (targetCode) {
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
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once per client/URL service param
  }, [clientId, clientCountry, params.get("service")]);

  useEffect(() => {
    void load();
  }, [load]);

  const showSwitcher = services.length > 1;

  const onSelect = async (code: string) => {
    if (code === activeCode || switching) return;
    setSwitching(code);
    try {
      const ok = await switchClientActiveService({
        clientId,
        serviceCode: code,
        catalogue,
        clientCountry,
      });
      if (!ok) {
        toast.error("No matching pipeline for this service — assign manually below");
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

  if (loading || !showSwitcher) return null;

  return (
    <div className="rounded-xl border bg-card p-2 shadow-elev-sm">
      <div className="px-2 pt-1 pb-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Active application
        </div>
        <p className="text-[11px] text-muted-foreground">
          {services.length} services — select one to view its stage progress
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
        {services.map((s) => {
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
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
