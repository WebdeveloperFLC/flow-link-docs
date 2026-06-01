import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FileText, FileUp, Filter, ListChecks, ChevronRight, Search, Loader2, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "./ServiceLibraryAdmin";

const ALLOWED_COUNTRY_SET = new Set(ALLOWED_SERVICE_LIBRARY_COUNTRIES);

type FeeItem = { id: string; fee_label: string; amount: string | null; currency: string | null; notes: string | null };
type Attachment = {
  id: string;
  file_name: string;
  file_path: string;
  label: string | null;
  mime_type: string | null;
};
type LibraryRow = {
  id: string;
  country: string;
  service_category: string;
  service: string;
  sub_service: string;
  checklist_text: string | null;
  process_flow: unknown;
  service_library_fee_items: FeeItem[];
  service_library_attachments: Attachment[];
};

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export default function ServiceLibrary() {
  const [country, setCountry] = useState<string>("");
  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [subService, setSubService] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery<LibraryRow[]>({
    queryKey: ["service-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library")
        .select("*, service_library_fee_items(*), service_library_attachments(*)")
        .eq("is_active", true)
        .order("country")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as LibraryRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!ALLOWED_COUNTRY_SET.has(r.country)) return false;
      if (country && r.country !== country) return false;
      if (serviceCategory && r.service_category !== serviceCategory) return false;
      if (service && r.service !== service) return false;
      if (subService && r.sub_service !== subService) return false;
      if (!q) return true;
      return [r.country, r.service_category, r.service, r.sub_service, r.checklist_text ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, country, serviceCategory, service, subService, search]);

  const countries = useMemo(() => uniq(rows.map((r) => r.country)), [rows]);
  const categories = useMemo(
    () => uniq(rows.filter((r) => !country || r.country === country).map((r) => r.service_category)),
    [rows, country],
  );
  const services = useMemo(
    () =>
      uniq(
        rows
          .filter((r) => (!country || r.country === country) && (!serviceCategory || r.service_category === serviceCategory))
          .map((r) => r.service),
      ),
    [rows, country, serviceCategory],
  );
  const subServices = useMemo(
    () =>
      uniq(
        rows
          .filter(
            (r) =>
              (!country || r.country === country) &&
              (!serviceCategory || r.service_category === serviceCategory) &&
              (!service || r.service === service),
          )
          .map((r) => r.sub_service),
      ),
    [rows, country, serviceCategory, service],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const processFlow: string[] = Array.isArray(selected?.process_flow) ? (selected!.process_flow as string[]) : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ListChecks className="h-4 w-4" />
            Service Library
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Country-wise checklist and fee reference</h1>
          <p className="mt-2 text-sm text-slate-600">
            Filter by country, category, service or sub-service. Click an entry to view its checklist, fees, process flow and files.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-4">
            <Panel title="Search & filters" icon={<Filter className="h-4 w-4" />}>
              <Field label="Search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search checklist, service…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </Field>
              <FilterSelect label="Country" value={country} onChange={(v) => { setCountry(v); setServiceCategory(""); setService(""); setSubService(""); }} options={countries} />
              <FilterSelect label="Service Category" value={serviceCategory} onChange={(v) => { setServiceCategory(v); setService(""); setSubService(""); }} options={categories} />
              <FilterSelect label="Service" value={service} onChange={(v) => { setService(v); setSubService(""); }} options={services} />
              <FilterSelect label="Sub-service" value={subService} onChange={setSubService} options={subServices} />
            </Panel>

            <Panel title={`Entries (${filtered.length})`} icon={<ListChecks className="h-4 w-4" />}>
              <div className="space-y-1 max-h-[420px] overflow-auto">
                {isLoading && (
                  <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                )}
                {!isLoading && filtered.length === 0 && (
                  <div className="p-3 text-sm text-slate-500">No matching entries.</div>
                )}
                {filtered.map((r) => {
                  const active = selected?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        active ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium">
                        {r.country} · {r.service}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.service_category} · {r.sub_service}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>

          <div className="space-y-6 xl:col-span-8">
            {selected ? (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title="Checklist" icon={<FileText className="h-4 w-4" />}>
                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {selected.checklist_text || "No checklist text yet."}
                    </div>
                  </Panel>

                  <Panel title="Fee structure" icon={<ListChecks className="h-4 w-4" />}>
                    {selected.service_library_fee_items.length === 0 ? (
                      <div className="text-sm text-slate-500">No fee items.</div>
                    ) : (
                      <div className="space-y-3">
                        {selected.service_library_fee_items.map((fee) => (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                          >
                            <span className="text-slate-600">{fee.fee_label}</span>
                            <span className="font-medium text-slate-900">
                              {[fee.currency, fee.amount].filter(Boolean).join(" ") || fee.notes || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>

                <Panel title="Process flow" icon={<ChevronRight className="h-4 w-4" />}>
                  {processFlow.length === 0 ? (
                    <div className="text-sm text-slate-500">No process flow defined.</div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      {processFlow.map((step, index) => (
                        <div key={`${step}-${index}`} className="flex items-center gap-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium">
                            {index + 1}. {step}
                          </div>
                          {index < processFlow.length - 1 && <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Available files" icon={<FileUp className="h-4 w-4" />}>
                  {selected.service_library_attachments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      No files attached.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selected.service_library_attachments.map((a) => (
                        <AttachmentLink key={a.id} attachment={a} />
                      ))}
                    </div>
                  )}
                </Panel>
              </>
            ) : (
              <Panel title="No entry selected" icon={<FileText className="h-4 w-4" />}>
                <div className="text-sm text-slate-500">
                  {isLoading ? "Loading entries…" : "Select an entry from the list to view details."}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentLink({ attachment }: { attachment: Attachment }) {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("service-library-files")
        .createSignedUrl(attachment.file_path, 60 * 10);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={open}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50"
    >
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-800">{attachment.label || attachment.file_name}</div>
        <div className="truncate text-xs text-slate-500">{attachment.file_name}</div>
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-500" />}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <select
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      {children}
    </div>
  );
}
