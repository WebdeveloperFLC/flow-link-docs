import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KcQuizQuestion } from "../types/kc";

const LEVEL_LABELS: Record<number, string> = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };

export function QuizSectionPanel({ questions, showAnswers }: { questions: KcQuizQuestion[]; showAnswers?: boolean }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) return <p className="text-sm text-muted-foreground">No quiz questions yet.</p>;

  const q = questions[index];
  const options = Array.isArray(q.options) ? q.options : [];

  const submit = () => {
    if (selected === null) return;
    if (selected === q.correct_index) setScore((s) => s + 1);
    if (index >= questions.length - 1) setDone(true);
    else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  if (done) {
    return (
      <Card className="p-6 text-center space-y-2">
        <div className="text-lg font-semibold">Score: {score} / {questions.length}</div>
        <Button size="sm" variant="outline" onClick={() => { setIndex(0); setSelected(null); setScore(0); setDone(false); }}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Question {index + 1} of {questions.length}</span>
        {q.level && <Badge variant="outline">{LEVEL_LABELS[q.level] ?? q.level}</Badge>}
      </div>
      <p className="font-medium">{q.question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <Button
            key={i}
            variant={selected === i ? "default" : "outline"}
            className="w-full justify-start text-left h-auto py-2"
            onClick={() => setSelected(i)}
          >
            {opt}
          </Button>
        ))}
      </div>
      {showAnswers && q.explanation && (
        <p className="text-xs text-muted-foreground border-t pt-2">{q.explanation}</p>
      )}
      <div className="flex gap-2">
        <Button disabled={selected === null} onClick={submit}>Next</Button>
      </div>
    </Card>
  );
}
