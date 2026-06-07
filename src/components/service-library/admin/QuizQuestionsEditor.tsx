import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceAcademyMetadata } from "@/lib/service-library/academyTypes";

type QuizItem = NonNullable<ServiceAcademyMetadata["quiz"]>[number];

const LEVELS: { value: "1" | "2" | "3"; label: string }[] = [
  { value: "1", label: "Level 1 — Fundamentals" },
  { value: "2", label: "Level 2 — Process & documents" },
  { value: "3", label: "Level 3 — Advanced / compliance" },
];

function emptyQuestion(level: 1 | 2 | 3): QuizItem {
  return {
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    level,
  };
}

export function QuizQuestionsEditor({
  items,
  onChange,
}: {
  items: QuizItem[];
  onChange: (items: QuizItem[]) => void;
}) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const q of items) {
    const lv = q.level ?? 1;
    if (lv === 1 || lv === 2 || lv === 3) counts[lv]++;
  }

  const update = (index: number, patch: Partial<QuizItem>) => {
    onChange(items.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const q = items[qIndex];
    const options = [...q.options];
    options[optIndex] = value;
    update(qIndex, { options });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          <strong>{items.length}</strong> questions
        </span>
        {LEVELS.map((l) => (
          <span key={l.value}>
            · L{l.value}: {counts[Number(l.value) as 1 | 2 | 3]}
          </span>
        ))}
        <span className="text-amber-700">Target: 25 per level (75 total) for full academy coverage</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Button
            key={l.value}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...items, emptyQuestion(Number(l.value) as 1 | 2 | 3)])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add L{l.value}
          </Button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
          No quiz questions yet. Add manually or paste a <code>quiz</code> array via Bulk JSON and click Apply JSON.
        </p>
      )}

      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {items.map((q, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2 bg-background">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Question {i + 1}</span>
              <div className="flex items-center gap-2">
                <Select
                  value={String(q.level ?? 1)}
                  onValueChange={(v) => update(i, { level: Number(v) as 1 | 2 | 3 })}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        Level {l.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <Textarea
              rows={2}
              placeholder="Question text"
              value={q.question}
              onChange={(e) => update(i, { question: e.target.value })}
            />
            <div className="grid sm:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.correctIndex === oi}
                    onChange={() => update(i, { correctIndex: oi })}
                    title="Correct answer"
                  />
                  <Input
                    placeholder={`Option ${oi + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, oi, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
            <Input
              placeholder="Explanation (shown after answer)"
              value={q.explanation ?? ""}
              onChange={(e) => update(i, { explanation: e.target.value })}
              className="text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
