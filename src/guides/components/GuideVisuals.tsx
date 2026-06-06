import { ChevronRight, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal step flow: one step per line */
export function GuideFlowChart({ lines }: { lines: string[] }) {
  const steps = lines.map((l) => l.trim()).filter(Boolean);
  if (steps.length === 0) return null;
  return (
    <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/15 overflow-x-auto">
      <div className="flex flex-wrap items-center gap-2 min-w-max">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="px-3 py-2 rounded-lg bg-card border shadow-sm text-sm font-medium text-foreground max-w-[200px] text-center">
              <span className="text-[10px] text-primary font-bold block mb-0.5">STEP {i + 1}</span>
              {step}
            </div>
            {i < steps.length - 1 && <ChevronRight className="size-4 text-primary/60 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two-tier access model: line 1 = tier names, line 2+ = bullet items separated by | */
export function GuideTierChart({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;
  const [leftTitle, rightTitle] = lines[0].split("|").map((s) => s.trim());
  const leftItems = lines[1]?.split("|").map((s) => s.trim()) ?? [];
  const rightItems = lines[2]?.split("|").map((s) => s.trim()) ?? [];
  return (
    <div className="my-6 grid md:grid-cols-2 gap-4">
      <div className="rounded-xl border-2 border-orange-400/40 bg-orange-500/5 p-4 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          {leftTitle}
        </div>
        <ul className="space-y-1.5 text-sm">
          {leftItems.filter(Boolean).map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-orange-500">●</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border-2 border-blue-400/40 bg-blue-500/5 p-4 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          {rightTitle}
        </div>
        <ul className="space-y-1.5 text-sm">
          {rightItems.filter(Boolean).map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-blue-500">●</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** App navigation map: Menu | Route | Screen per line */
export function GuideNavMap({ lines }: { lines: string[] }) {
  const rows = lines
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter((r) => r.length >= 2);
  return (
    <div className="my-6 rounded-xl border overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1.2fr] bg-muted/80 text-xs font-semibold uppercase tracking-wider">
        <div className="p-3 border-r">Menu</div>
        <div className="p-3 border-r">Route</div>
        <div className="p-3">Screen</div>
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            "grid grid-cols-[1fr_1fr_1.2fr] text-sm border-t",
            i % 2 === 0 ? "bg-card" : "bg-muted/20",
          )}
        >
          <div className="p-3 border-r font-medium">{row[0]}</div>
          <div className="p-3 border-r font-mono text-xs text-primary">{row[1]}</div>
          <div className="p-3 text-muted-foreground">{row[2]}</div>
        </div>
      ))}
    </div>
  );
}

/** Status pipeline: statuses left to right */
export function GuideStatusPipeline({ lines }: { lines: string[] }) {
  const statuses = lines.map((l) => l.trim()).filter(Boolean);
  return (
    <div className="my-6 flex flex-wrap items-center gap-1 p-4 rounded-xl bg-muted/30 border overflow-x-auto">
      {statuses.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
              s === "published" && "bg-success/15 text-success",
              s === "approved" && "bg-primary/15 text-primary",
              s === "pending_review" && "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
              s === "rejected" && "bg-destructive/15 text-destructive",
              s === "needs_update" && "bg-orange-500/15 text-orange-700",
              s === "unmatched_ai_intake" && "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
              s === "ai_counseling" && "bg-violet-500/15 text-violet-700 dark:text-violet-400",
              s === "awaiting_assignment_confirm" && "bg-orange-500/15 text-orange-700 dark:text-orange-400",
              s === "assigned_active" && "bg-primary/15 text-primary",
              s === "existing_client" && "bg-success/15 text-success",
              s === "closed" && "bg-muted text-muted-foreground",
              ![
                "published",
                "approved",
                "pending_review",
                "rejected",
                "needs_update",
                "unmatched_ai_intake",
                "ai_counseling",
                "awaiting_assignment_confirm",
                "assigned_active",
                "existing_client",
                "closed",
              ].includes(s) && "bg-muted text-foreground",
            )}
          >
            {s.replace(/_/g, " ")}
          </span>
          {i < statuses.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />}
        </div>
      ))}
    </div>
  );
}

/** Vertical decision tree: Question? then Yes → / No → on separate lines with indent */
export function GuideDecisionTree({ lines }: { lines: string[] }) {
  return (
    <div className="my-6 space-y-2 p-4 rounded-xl border bg-card font-mono text-sm">
      {lines.map((line, i) => {
        const depth = (line.match(/^\s*/)?.[0].length ?? 0) / 2;
        const text = line.trim();
        const isQuestion = text.endsWith("?");
        return (
          <div
            key={i}
            className={cn("flex items-start gap-2", depth > 0 && "ml-4")}
            style={{ marginLeft: depth * 16 }}
          >
            {isQuestion ? (
              <span className="text-primary font-semibold">{text}</span>
            ) : text.startsWith("→") ? (
              <>
                <ArrowDown className="size-3.5 mt-1 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{text.slice(1).trim()}</span>
              </>
            ) : (
              <span>{text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function GuideVisualBlock({ language, content }: { language: string; content: string }) {
  const lines = content.split("\n");
  switch (language) {
    case "flow":
      return <GuideFlowChart lines={lines} />;
    case "tier":
      return <GuideTierChart lines={lines} />;
    case "navmap":
      return <GuideNavMap lines={lines} />;
    case "status":
      return <GuideStatusPipeline lines={lines} />;
    case "decision":
      return <GuideDecisionTree lines={lines} />;
    default:
      return (
        <pre className="my-4 p-4 rounded-lg bg-muted border text-xs overflow-x-auto">
          <code>{content}</code>
        </pre>
      );
  }
}
