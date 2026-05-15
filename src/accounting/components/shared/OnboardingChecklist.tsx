import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { dismissOnboarding } from "../../stores/onboardingStore";

const STEPS = [
  { label: "Add your first entity", to: "/accounting/settings/entities" },
  { label: "Set up chart of accounts", to: "/accounting/coa" },
  { label: "Upload a bank statement", to: "/accounting/reconciliation" },
  { label: "Invite your accountant", to: "/accounting/settings/users" },
  { label: "Configure tax codes", to: "/accounting/tax" },
];

export default function OnboardingChecklist({ onDismiss }: { onDismiss?: () => void }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const total = STEPS.length;
  const complete = done.size;

  return (
    <Card className="p-5 shadow-elev-sm border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <div className="font-semibold">Get started with Accounting</div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {complete}/{total}
          </span>
        </div>
        <button onClick={() => { dismissOnboarding(); onDismiss?.(); }}
          className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {STEPS.map((s, i) => {
          const ok = done.has(i);
          return (
            <Link key={s.label} to={s.to}
              onClick={() => setDone(prev => { const n = new Set(prev); n.add(i); return n; })}
              className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border hover:border-primary/40 transition-colors">
              {ok
                ? <CheckCircle2 className="size-4 text-primary flex-shrink-0" />
                : <Circle className="size-4 text-muted-foreground/50 flex-shrink-0" />}
              <span className="text-[12px] font-medium text-foreground/80">{s.label}</span>
            </Link>
          );
        })}
      </div>
      {complete === total && (
        <Button size="sm" className="mt-4" onClick={() => { dismissOnboarding(); onDismiss?.(); }}>
          Finish setup
        </Button>
      )}
    </Card>
  );
}