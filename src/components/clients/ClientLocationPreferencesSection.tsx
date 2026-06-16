import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMasterItems } from "@/lib/masters";
import { selectionHasStudentServices } from "@/lib/studentServices";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";

type PrefRow = {
  id?: string;
  country: string;
  province_state: string;
  province_code: string;
  city: string;
  sort_order: number;
};

type Props = {
  clientId: string;
  canEdit: boolean;
  services: Partial<ServiceSelection>;
  serviceLabels?: Map<string, string>;
};

export function ClientLocationPreferencesSection({
  clientId,
  canEdit,
  services,
  serviceLabels,
}: Props) {
  const [rows, setRows] = useState<PrefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const provinces = useMasterItems("location_provinces");
  const cities = useMasterItems("location_cities");

  const showSection = useMemo(
    () => selectionHasStudentServices(services, serviceLabels),
    [services, serviceLabels],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_location_preferences")
      .select("id,country,province_state,province_code,city,sort_order")
      .eq("client_id", clientId)
      .order("sort_order", { ascending: true });
    if (error) console.warn(error);
    setRows(
      (data ?? []).map((r) => ({
        id: r.id,
        country: r.country,
        province_state: r.province_state,
        province_code: r.province_code ?? "",
        city: r.city,
        sort_order: r.sort_order ?? 0,
      })),
    );
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (showSection) load();
    else setLoading(false);
  }, [showSection, load]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const p of provinces) {
      const c = (p.metadata as { country?: string } | null)?.country;
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [provinces]);

  const provincesForCountry = (country: string) =>
    provinces.filter((p) => (p.metadata as { country?: string } | null)?.country === country);

  const citiesForProvince = (provinceCode: string) =>
    cities.filter((c) => (c.metadata as { province_code?: string } | null)?.province_code === provinceCode);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { country: countries[0] ?? "Canada", province_state: "", province_code: "", city: "", sort_order: prev.length },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from("client_location_preferences").delete().eq("client_id", clientId);
      const valid = rows.filter((r) => r.country && r.province_state && r.city);
      if (valid.length) {
        const { error } = await supabase.from("client_location_preferences").insert(
          valid.map((r, idx) => ({
            client_id: clientId,
            country: r.country,
            province_state: r.province_state,
            province_code: r.province_code || null,
            city: r.city,
            sort_order: idx,
          })) as never,
        );
        if (error) throw error;
      }
      toast.success("Location preferences saved");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!showSection) return null;

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading location preferences…
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <h3 className="font-semibold">Student location preferences</h3>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="size-4 mr-1" /> Add
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Optional study destinations for student services — used for counselling and future AI recommendations.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No preferences yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id ?? idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end border rounded-lg p-3">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select
                  value={row.country}
                  onValueChange={(v) => {
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, country: v, province_state: "", province_code: "", city: "" } : r,
                      ),
                    );
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Province / State</Label>
                <Select
                  value={row.province_code || row.province_state}
                  onValueChange={(code) => {
                    const p = provinces.find((x) => x.code === code);
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx
                          ? { ...r, province_code: code, province_state: p?.label ?? code, city: "" }
                          : r,
                      ),
                    );
                  }}
                  disabled={!canEdit || !row.country}
                >
                  <SelectTrigger><SelectValue placeholder="Province" /></SelectTrigger>
                  <SelectContent>
                    {provincesForCountry(row.country).map((p) => (
                      <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Select
                  value={row.city}
                  onValueChange={(v) =>
                    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, city: v } : r)))
                  }
                  disabled={!canEdit || !row.province_code}
                >
                  <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                  <SelectContent>
                    {citiesForProvince(row.province_code).map((c) => (
                      <SelectItem key={c.code} value={c.label}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
