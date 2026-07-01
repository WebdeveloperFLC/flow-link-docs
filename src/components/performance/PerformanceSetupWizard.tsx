import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { ChevronRight, Sparkles } from "lucide-react";

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface PerformanceSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where full plan editor lives — preserved route, not redesigned */
  fullEditorHref?: string;
}

/**
 * Admin plan setup wizard shell (Bible §12).
 * Auto-fills period; final step opens existing plan editor — no new engine logic.
 */
export function PerformanceSetupWizard({
  open,
  onOpenChange,
  fullEditorHref = "/incentives/plans",
}: PerformanceSetupWizardProps) {
  const { period } = usePerformancePeriod();
  const [step, setStep] = useState<WizardStep>(1);
  const [planName, setPlanName] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [stackRole, setStackRole] = useState("counselor");
  const [targetHint, setTargetHint] = useState("");

  function reset() {
    setStep(1);
    setPlanName("");
    setPeriodType("monthly");
    setStackRole("counselor");
    setTargetHint("");
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set up incentive plan</DialogTitle>
          <DialogDescription>
            Step {step} of 5 — configuration easier than operation. Values marked auto-filled come from hub context.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Plan name</Label>
              <Input className="mt-1" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Counselor revenue plan" />
            </div>
            <div>
              <Label>Who earns?</Label>
              <Select value={stackRole} onValueChange={setStackRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counselor">Counselor</SelectItem>
                  <SelectItem value="manager">Branch manager</SelectItem>
                  <SelectItem value="telecaller">Telecaller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <Label>Period type</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card className="p-3 text-sm ph-surface-card">
              <p className="text-xs ph-muted uppercase tracking-wide">Auto-filled</p>
              <p className="mt-1">
                First period key: <span className="font-semibold">{period}</span>
              </p>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Label>Target direction (optional)</Label>
            <Input
              value={targetHint}
              onChange={(e) => setTargetHint(e.target.value)}
              placeholder="e.g. 10% growth vs last period"
            />
            <p className="text-xs ph-muted flex items-center gap-1">
              <Sparkles className="size-3.5" />
              Full target suggestions available in the plan editor via existing RPC.
            </p>
          </div>
        )}

        {step === 4 && (
          <Card className="p-4 space-y-2 text-sm ph-surface-card">
            <p className="font-medium ph-heading">Live preview</p>
            <p>
              <span className="ph-muted">Plan:</span> {planName || "Untitled plan"}
            </p>
            <p>
              <span className="ph-muted">Role:</span> {stackRole} · {periodType}
            </p>
            <p>
              <span className="ph-muted">Period:</span> {period}
            </p>
            {targetHint && (
              <p>
                <span className="ph-muted">Target note:</span> {targetHint}
              </p>
            )}
            <p className="text-xs ph-muted pt-2">Rules, slabs and stacking are configured in the full editor — engine logic unchanged.</p>
          </Card>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <p>Ready to open the full plan editor with this context. No plan is saved until you complete the existing editor flow.</p>
            <Button asChild className="w-full gap-1">
              <Link to={fullEditorHref} onClick={() => close()}>
                Open plan editor
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && step < 5 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => (s - 1) as WizardStep)}>
              Back
            </Button>
          )}
          {step < 5 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={step === 1 && !planName.trim()}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={close}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
