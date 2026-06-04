import { useState } from "react";
import { Brain, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";

type Props = {
  questions: AcademyViewModel["quiz"];
  learningMinutes?: number;
};

export function ServiceLibraryQuiz({ questions, learningMinutes }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) {
    return (
      <Card className="p-8 text-center shadow-elev-sm">
        <Brain className="size-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold">Knowledge check</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Add quiz questions in Service Library Admin → Service content (JSON: <code>quiz</code> array).
        </p>
      </Card>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="p-8 text-center shadow-elev-sm">
        <CheckCircle2 className="size-12 mx-auto text-success mb-3" />
        <h3 className="font-semibold text-lg">Quiz complete</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {score} of {questions.length} correct ({pct}%)
        </p>
        <Button className="mt-4" variant="outline" onClick={() => { setIndex(0); setPicked(null); setScore(0); setDone(false); }}>
          Retake quiz
        </Button>
      </Card>
    );
  }

  const q = questions[index];
  const answered = picked !== null;
  const correct = picked === q.correctIndex;

  const next = () => {
    if (index + 1 >= questions.length) setDone(true);
    else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  return (
    <Card className="p-6 shadow-elev-sm max-w-2xl">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        {learningMinutes ? <span>~{learningMinutes} min read</span> : null}
      </div>
      <h3 className="font-semibold text-base mb-4">{q.question}</h3>
      <ul className="space-y-2">
        {q.options.map((opt, i) => {
          let style = "border-border hover:bg-muted/40";
          if (answered) {
            if (i === q.correctIndex) style = "border-success bg-success/10";
            else if (i === picked) style = "border-destructive bg-destructive/10";
          } else if (picked === i) style = "border-primary bg-primary/5";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => {
                  if (answered) return;
                  setPicked(i);
                  if (i === q.correctIndex) setScore((s) => s + 1);
                }}
                className={cn(
                  "w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors",
                  style,
                )}
              >
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div
          className={cn(
            "mt-4 flex gap-2 text-sm rounded-lg p-3",
            correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {correct ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
          <span>{q.explanation ?? (correct ? "Correct." : "Review the service content and try again.")}</span>
        </div>
      )}
      <Button className="mt-4" disabled={!answered} onClick={next}>
        {index + 1 >= questions.length ? "Finish" : "Next question"}
      </Button>
    </Card>
  );
}
