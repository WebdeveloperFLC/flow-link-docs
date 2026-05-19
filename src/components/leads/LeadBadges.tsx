import { cn } from "@/lib/utils";

const tempStyle: Record<string, string> = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-amber-100 text-amber-800 border-amber-200",
  cold: "bg-blue-100 text-blue-700 border-blue-200",
};

export const LeadTemperatureBadge = ({ value }: { value: string }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize", tempStyle[value] ?? "bg-muted text-muted-foreground border-border")}>
    {value}
  </span>
);

const statusStyle: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-indigo-100 text-indigo-700",
  qualified: "bg-emerald-100 text-emerald-700",
  converted: "bg-green-100 text-green-700",
  unqualified: "bg-zinc-100 text-zinc-600",
  lost: "bg-rose-100 text-rose-700",
};

export const LeadStatusBadge = ({ value }: { value: string }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize", statusStyle[value] ?? "bg-muted text-muted-foreground")}>
    {value}
  </span>
);