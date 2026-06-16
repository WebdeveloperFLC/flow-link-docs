import type { CaseOutcome } from "@/lib/clientServiceCase";

/** Shared outcome colours — approved dark green, refused blood red, reapply orange. */
export const OUTCOME_BADGE: Record<
  CaseOutcome,
  { label: string; className: string }
> = {
  approved: {
    label: "Approved",
    className:
      "border-emerald-900/80 bg-emerald-900 text-emerald-50 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
  },
  refused: {
    label: "Refused",
    className:
      "border-red-950/90 bg-red-950 text-red-50 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
  },
  withdrawn: {
    label: "Withdrawn",
    className:
      "border-slate-500/60 bg-slate-600 text-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
  },
};

export const OUTCOME_PICKER = {
  approved: {
    btn: "border-emerald-800/70 bg-emerald-950/5 hover:bg-emerald-950/15 dark:border-emerald-700 dark:hover:bg-emerald-950/30",
    icon: "text-emerald-800 dark:text-emerald-400",
    confirm: "bg-emerald-900 hover:bg-emerald-950 text-white",
  },
  refused: {
    btn: "border-red-900/70 bg-red-950/5 hover:bg-red-950/15 dark:border-red-800 dark:hover:bg-red-950/30",
    icon: "text-red-900 dark:text-red-400",
    confirm: "bg-red-950 hover:bg-red-900 text-white",
  },
  reapply: {
    btn: "border-orange-600/70 bg-orange-500/5 hover:bg-orange-500/15 dark:border-orange-500 dark:hover:bg-orange-950/30",
    icon: "text-orange-600 dark:text-orange-400",
    confirm: "bg-orange-600 hover:bg-orange-700 text-white",
  },
} as const;
