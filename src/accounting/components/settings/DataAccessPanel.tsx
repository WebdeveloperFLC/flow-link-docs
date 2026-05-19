import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEntities } from "../../stores/accountingEntitiesStore";

type ScopeRow = {
  id: string;
  accounting_user_id: string;
  scope_type: "country" | "entity";
  country_code: string | null;
  entity_id: string | null;
  can_view: boolean;
  can_edit: boolean;
};

interface Cell { view: boolean; edit: boolean; }
type CountryMap = Record<string, Cell>;
type EntityMap = Record<string, Cell>;

const COUNTRY_LABEL: Record<string, string> = { IN: "India 🇮🇳", CA: "Canada 🇨🇦" };

export default function DataAccessPanel({
  accountingUserId,
  isAdminRole,
}: { accountingUserId: string; isAdminRole: boolean }) {
  const entities = useEntities();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"full" | "restricted">("full");
  const [countries, setCountries] = useState<CountryMap>({});
  const [entityScopes, setEntityScopes] = useState<EntityMap>({});
  const [dirty, setDirty] = useState(false);

  const byCountry = useMemo(() => {
    const m: Record<string, typeof entities> = {};
    for (const e of entities) {
      const c = e.country || "—";
      (m[c] ||= []).push(e);
    }
    return m;
  }, [entities]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounting_user_entity_scope" as any)
      .select("*")
      .eq("accounting_user_id", accountingUserId);
    const rows = (data ?? []) as unknown as ScopeRow[];
    const cMap: CountryMap = {};
    const eMap: EntityMap = {};
    for (const r of rows) {
      if (r.scope_type === "country" && r.country_code) {
        cMap[r.country_code] = { view: r.can_view, edit: r.can_edit };
      } else if (r.scope_type === "entity" && r.entity_id) {
        eMap[r.entity_id] = { view: r.can_view, edit: r.can_edit };
      }
    }
    setCountries(cMap);
    setEntityScopes(eMap);
    setMode(rows.length === 0 ? "full" : "restricted");
    setDirty(false);
    setLoading(false);
  };

  useEffect(() => { if (!isAdminRole) load(); }, [accountingUserId, isAdminRole]);

  if (isAdminRole) {
    return (
      <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-[12px] text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="size-3.5 text-primary" />
        Full data access across all countries and entities (locked for this role).
      </div>
    );
  }

  const setCountry = (code: string, key: keyof Cell, val: boolean) => {
    setDirty(true);
    setCountries((prev) => {
      const cur = prev[code] ?? { view: false, edit: false };
      const next = { ...cur, [key]: val };
      if (key === "view" && !val) next.edit = false;
      if (key === "edit" && val) next.view = true;
      return { ...prev, [code]: next };
    });
    // Cascade to entities under that country
    setEntityScopes((prev) => {
      const out = { ...prev };
      for (const e of byCountry[code] ?? []) {
        const cur = out[e.id] ?? { view: false, edit: false };
        const next = { ...cur, [key]: val };
        if (key === "view" && !val) next.edit = false;
        if (key === "edit" && val) next.view = true;
        out[e.id] = next;
      }
      return out;
    });
  };

  const setEntity = (id: string, key: keyof Cell, val: boolean) => {
    setDirty(true);
    setEntityScopes((prev) => {
      const cur = prev[id] ?? { view: false, edit: false };
      const next = { ...cur, [key]: val };
      if (key === "view" && !val) next.edit = false;
      if (key === "edit" && val) next.view = true;
      return { ...prev, [id]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from("accounting_user_entity_scope" as any)
        .delete().eq("accounting_user_id", accountingUserId);
      if (mode === "restricted") {
        const inserts: any[] = [];
        for (const [code, c] of Object.entries(countries)) {
          if (c.view || c.edit) inserts.push({
            accounting_user_id: accountingUserId, scope_type: "country",
            country_code: code, can_view: c.view, can_edit: c.edit,
          });
        }
        for (const [eid, c] of Object.entries(entityScopes)) {
          if (c.view || c.edit) inserts.push({
            accounting_user_id: accountingUserId, scope_type: "entity",
            entity_id: eid, can_view: c.view, can_edit: c.edit,
          });
        }
        if (inserts.length > 0) {
          const { error } = await supabase
            .from("accounting_user_entity_scope" as any)
            .insert(inserts);
          if (error) throw error;
        }
      }
      toast.success("Data access saved");
      setDirty(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await supabase.from("accounting_user_entity_scope" as any)
        .delete().eq("accounting_user_id", accountingUserId);
      toast.success("Reset to full access");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-[12px] text-muted-foreground flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading data access…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[12px]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" checked={mode === "full"} onChange={() => { setMode("full"); setDirty(true); }} />
          Full access (all countries & entities)
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" checked={mode === "restricted"} onChange={() => { setMode("restricted"); setDirty(true); }} />
          Restricted
        </label>
      </div>

      {mode === "restricted" && (
        <div className="rounded-md border bg-background overflow-hidden">
          <div className="grid grid-cols-[1fr_64px_64px] items-center px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/40 border-b">
            <div>Scope</div>
            <div className="text-center">View</div>
            <div className="text-center">Edit</div>
          </div>
          {Object.entries(byCountry).map(([code, ents]) => {
            const c = countries[code] ?? { view: false, edit: false };
            return (
              <div key={code}>
                <div className="grid grid-cols-[1fr_64px_64px] items-center px-3 py-2 border-t text-[13px] bg-muted/20 font-medium">
                  <div>{COUNTRY_LABEL[code] ?? code} <span className="text-[10.5px] font-normal text-muted-foreground">— country level (all {COUNTRY_LABEL[code] ?? code})</span></div>
                  <div className="flex justify-center"><Checkbox checked={c.view} onCheckedChange={(v) => setCountry(code, "view", !!v)} /></div>
                  <div className="flex justify-center"><Checkbox checked={c.edit} disabled={!c.view} onCheckedChange={(v) => setCountry(code, "edit", !!v)} /></div>
                </div>
                {ents.map((e) => {
                  const ec = entityScopes[e.id] ?? { view: false, edit: false };
                  return (
                    <div key={e.id} className="grid grid-cols-[1fr_64px_64px] items-center px-3 py-1.5 border-t text-[12.5px] hover:bg-muted/30">
                      <div className="pl-6 truncate text-muted-foreground">↳ {e.name}</div>
                      <div className="flex justify-center"><Checkbox checked={ec.view} onCheckedChange={(v) => setEntity(e.id, "view", !!v)} /></div>
                      <div className="flex justify-center"><Checkbox checked={ec.edit} disabled={!ec.view} onCheckedChange={(v) => setEntity(e.id, "edit", !!v)} /></div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving…" : "Save data access"}
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={reset}>
          Reset to full access
        </Button>
      </div>
    </div>
  );
}