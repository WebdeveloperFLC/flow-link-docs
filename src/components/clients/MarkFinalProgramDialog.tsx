import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ClientProgramEnriched } from "@/lib/clientPrograms";

const KEEP_ME = "__keep_me__";

type OwnerOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: ClientProgramEnriched | null;
  onConfirm: (values: {
    intakeTerm: string;
    campusName: string;
    ownerUserId: string;
    setPrimary: boolean;
  }) => Promise<void>;
};

function campusOptions(program: ClientProgramEnriched): string[] {
  const fromCourse = program.course.campus_names ?? [];
  const fromSelection = program.selected_campus ? [program.selected_campus] : [];
  return [...new Set([...fromCourse, ...fromSelection].map((s) => s.trim()).filter(Boolean))].sort();
}

function intakeSuggestions(program: ClientProgramEnriched): string[] {
  const months = program.course.intake_months ?? [];
  const year = program.course.intake_year;
  const suggestions = months.map((m) => (year ? `${m} ${year}` : m));
  if (program.selected_intake_term) suggestions.unshift(program.selected_intake_term);
  return [...new Set(suggestions.filter(Boolean))];
}

export function MarkFinalProgramDialog({ open, onOpenChange, program, onConfirm }: Props) {
  const [intakeTerm, setIntakeTerm] = useState("");
  const [campusName, setCampusName] = useState("");
  const [ownerChoice, setOwnerChoice] = useState(KEEP_ME);
  const [setPrimary, setSetPrimary] = useState(true);
  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("Me");
  const [busy, setBusy] = useState(false);

  const campuses = useMemo(() => (program ? campusOptions(program) : []), [program]);
  const intakes = useMemo(() => (program ? intakeSuggestions(program) : []), [program]);

  useEffect(() => {
    if (!open) return;
    void supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        void supabase
          .from("profiles")
          .select("full_name")
          .eq("id", uid)
          .maybeSingle()
          .then(({ data: prof }) => {
            setCurrentUserName((prof as { full_name?: string } | null)?.full_name ?? "Me");
          });
      }
    });
    void supabase
      .from("profiles")
      .select("id, full_name")
      .not("full_name", "is", null)
      .order("full_name")
      .limit(200)
      .then(({ data }) =>
        setOwnerOptions(
          ((data ?? []) as { id: string; full_name: string }[]).map((p) => ({
            id: p.id,
            name: p.full_name,
          })),
        ),
      );
  }, [open]);

  useEffect(() => {
    if (!program || !open) return;
    const suggested = intakeSuggestions(program);
    setIntakeTerm(suggested[0] ?? "");
    const campusList = campusOptions(program);
    setCampusName(campusList[0] ?? "");
    setOwnerChoice(KEEP_ME);
    setSetPrimary(true);
  }, [program?.id, open]);

  const handleSubmit = async () => {
    if (!program) return;
    if (!intakeTerm.trim()) return;
    if (!currentUserId && ownerChoice === KEEP_ME) return;
    const ownerUserId = ownerChoice === KEEP_ME ? currentUserId! : ownerChoice;
    setBusy(true);
    try {
      await onConfirm({
        intakeTerm: intakeTerm.trim(),
        campusName: campusName.trim(),
        ownerUserId,
        setPrimary,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark final &amp; create application</DialogTitle>
        </DialogHeader>
        {program && (
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Locks this program on the client file and opens a new{" "}
              <span className="font-medium text-foreground">Draft</span> application on the Applications tab.
            </p>
            <p className="text-sm font-medium">
              {program.course.university.name} — {program.course.name}
            </p>

            <div className="space-y-2">
              <Label htmlFor="mf-intake">Intake</Label>
              {intakes.length > 0 && (
                <Select value={intakeTerm} onValueChange={setIntakeTerm}>
                  <SelectTrigger id="mf-intake">
                    <SelectValue placeholder="Select intake" />
                  </SelectTrigger>
                  <SelectContent>
                    {intakes.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                value={intakeTerm}
                onChange={(e) => setIntakeTerm(e.target.value)}
                placeholder="e.g. Sep 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mf-campus">Campus</Label>
              {campuses.length > 0 && (
                <Select value={campusName || undefined} onValueChange={setCampusName}>
                  <SelectTrigger id="mf-campus">
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                placeholder="Campus name"
              />
            </div>

            <div className="space-y-2">
              <Label>Application owner</Label>
              <Select value={ownerChoice} onValueChange={setOwnerChoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_ME}>Keep me ({currentUserName})</SelectItem>
                  {ownerOptions
                    .filter((o) => o.id !== currentUserId)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="mf-primary"
                checked={setPrimary}
                onCheckedChange={(v) => setSetPrimary(!!v)}
              />
              <Label htmlFor="mf-primary" className="text-sm font-normal cursor-pointer">
                Set as primary for {program.course.country.name}
              </Label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={busy || !intakeTerm.trim()}>
            {busy && <Loader2 className="size-4 mr-1 animate-spin" />}
            Mark final &amp; create application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
