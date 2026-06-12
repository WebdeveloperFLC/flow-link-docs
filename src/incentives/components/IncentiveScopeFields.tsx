import { useEffect, useState } from "react";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { useMasterItems } from "@/lib/masters";
import { supabase } from "@/integrations/supabase/client";
import type { ScopeJson } from "@/incentives/lib/incentiveScopeLogic";
import { SCOPE_PRESET_KEYS, SCOPE_PRESET_LABELS } from "@/incentives/lib/incentiveScopeLogic";

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

export type ScopeFormState = {
  scope_preset: string;
  scope_json: ScopeJson;
};

interface Props {
  value: ScopeFormState;
  onChange: (v: ScopeFormState) => void;
}

export function IncentiveScopeFields({ value, onChange }: Props) {
  const countries = useMasterItems("countries");
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchAllServiceCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
    supabase.from("upi_institutions").select("id, name").order("name").then(({ data }) => {
      setInstitutions((data ?? []) as { id: string; name: string }[]);
    });
  }, []);

  const sj = value.scope_json;

  function patchScope(patch: Partial<ScopeJson>) {
    onChange({ ...value, scope_json: { ...sj, ...patch } });
  }

  function toggleInList(key: keyof ScopeJson, item: string) {
    const list = ((sj[key] as string[] | undefined) ?? []).slice();
    const i = list.indexOf(item);
    if (i >= 0) list.splice(i, 1);
    else list.push(item);
    patchScope({ [key]: list.length ? list : undefined });
  }

  const byMaster = catalogue.reduce<Record<string, ServiceCatalogueItem[]>>((acc, s) => {
    (acc[s.master_key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div>
        <label className="text-xs text-muted-foreground">Scope preset</label>
        <select
          className={sel}
          value={value.scope_preset || "all_services"}
          onChange={(e) => onChange({ ...value, scope_preset: e.target.value })}
        >
          {SCOPE_PRESET_KEYS.map((k) => (
            <option key={k} value={k}>{SCOPE_PRESET_LABELS[k]}</option>
          ))}
          <option value="">Custom (use filters below)</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Countries (optional — AND filter)</label>
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
          {countries.slice(0, 40).map((c) => (
            <label key={c.code} className="text-xs flex items-center gap-1 border rounded px-2 py-1 bg-background">
              <input
                type="checkbox"
                checked={(sj.country_codes ?? []).includes(c.code)}
                onChange={() => toggleInList("country_codes", c.code)}
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Institutions (optional — campaign / B2B)</label>
        <select
          className={sel}
          value=""
          onChange={(e) => {
            if (e.target.value) toggleInList("institution_ids", e.target.value);
          }}
        >
          <option value="">Add institution…</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        {(sj.institution_ids ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(sj.institution_ids ?? []).map((id) => (
              <span key={id} className="text-xs bg-primary/10 px-2 py-0.5 rounded">
                {institutions.find((i) => i.id === id)?.name ?? id}
                <button type="button" className="ml-1 text-muted-foreground" onClick={() => toggleInList("institution_ids", id)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Intake seasons (comma-separated, e.g. Sep-2026, Jan-2027)</label>
        <input
          className={sel}
          value={(sj.intakes ?? []).join(", ")}
          onChange={(e) =>
            patchScope({
              intakes: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
            })
          }
          placeholder="Sep-2026"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Specific services (optional)</label>
        <select
          className={sel}
          value=""
          onChange={(e) => {
            if (e.target.value) toggleInList("service_codes", e.target.value);
          }}
        >
          <option value="">Add service…</option>
          {Object.entries(byMaster).map(([mk, items]) => (
            <optgroup key={mk} label={mk.replace(/_/g, " ")}>
              {items.slice(0, 80).map((s) => (
                <option key={s.service_code ?? s.id} value={s.service_code ?? s.id}>
                  {s.service_name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {(sj.service_codes ?? []).length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {(sj.service_codes ?? []).length} service(s) selected
          </p>
        )}
      </div>
    </div>
  );
}
