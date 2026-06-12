import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTaskCountdown } from "@/lib/staffDirectory";

/** Live countdown for task due dates (updates every minute). */
export function TaskDueCountdown({
  dueAt,
  className,
}: {
  dueAt: string | null;
  className?: string;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!dueAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [dueAt]);

  if (!dueAt) return null;

  const { label, tone } = formatTaskCountdown(dueAt, now);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        tone === "overdue" && "text-destructive",
        tone === "urgent" && "text-amber-600 dark:text-amber-400",
        tone === "soon" && "text-amber-700 dark:text-amber-300",
        tone === "ok" && "text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
