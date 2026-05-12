import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { searchOccupations, type NocOccupation, categoryLabel } from "@/lib/noc";

export type OccupationValue = {
  noc_code: string;
  title: string;
  teer: number;
  broad_category: string | null;
  categories: string[];
} | null;

export function OccupationSearch({
  value,
  onChange,
}: {
  value: OccupationValue;
  onChange: (v: OccupationValue) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<NocOccupation[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    timer.current = window.setTimeout(async () => {
      const r = await searchOccupations(q, 12);
      setResults(r);
      setLoading(false);
    }, 220);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [q]);

  const pick = (r: NocOccupation) => {
    onChange({
      noc_code: r.noc_code,
      title: r.title,
      teer: r.teer,
      broad_category: r.broad_category,
      categories: r.categories ?? [],
    });
    setQ("");
    setOpen(false);
    setResults([]);
  };

  if (value) {
    return (
      <div className="rounded-xl border border-[hsl(30_12%_82%)] bg-white p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium text-[hsl(220_18%_11%)]">{value.title}</div>
            <div className="text-xs text-[hsl(220_14%_45%)]">{value.broad_category}</div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[hsl(220_14%_45%)] hover:text-[hsl(220_18%_11%)]"
            aria-label="Change occupation"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-[hsl(220_18%_11%)] text-white font-mono">NOC {value.noc_code}</span>
          <span className="px-2 py-0.5 rounded-full bg-[hsl(8_75%_60%)] text-white font-medium">TEER {value.teer}</span>
          {value.categories.map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-full bg-[hsl(36_20%_94%)] text-[hsl(220_18%_11%)]">{categoryLabel(c)}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-[hsl(30_12%_82%)] bg-white px-3 py-2.5 focus-within:border-[hsl(220_18%_11%)]">
        <Search className="size-4 text-[hsl(220_14%_45%)]" />
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search job title — e.g. software engineer, registered nurse, electrician"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {loading && <Loader2 className="size-3.5 animate-spin text-[hsl(220_14%_45%)]" />}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-auto rounded-xl border border-[hsl(30_12%_82%)] bg-white shadow-lg">
          {results.length === 0 && !loading && (
            <div className="px-3 py-4 text-sm text-[hsl(220_14%_45%)]">
              No occupations found. Try a different word, or contact your counselor.
            </div>
          )}
          {results.map((r) => (
            <button
              type="button"
              key={r.noc_code}
              onClick={() => pick(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-[hsl(36_20%_94%)] flex items-start justify-between gap-3 border-b border-[hsl(30_12%_92%)] last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[hsl(220_18%_11%)] truncate">{r.title}</div>
                <div className="text-[11px] text-[hsl(220_14%_45%)] truncate">{r.broad_category}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(36_20%_94%)] text-[hsl(220_18%_11%)]">{r.noc_code}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[hsl(8_75%_60%)] text-white">TEER {r.teer}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}