import { useMemo, useState } from "react";
import { Brain, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";

type Props = {
  questions: AcademyViewModel["quiz"];
  learningMinutes?: number;
};

type QuizLevel = 1 | 2 | 3;

const LEVEL_META: Record<QuizLevel, { label: string; hint: string }> = {
  1: { label: "Level 1", hint: "Fundamentals — definitions, fees, eligibility basics" },
  2: { label: "Level 2", hint: "Process & documents — forms, timelines, checklists" },
  3: { label: "Level 3", hint: "Advanced — red flags, compliance, complex scenarios" },
};

function groupByLevel(questions: AcademyViewModel["quiz"]) {
  const groups: Record<QuizLevel, AcademyViewModel["quiz"]> = { 1: [], 2: [], 3: [] };
  for (const q of questions) {
    const level = (q.level ?? 1) as QuizLevel;
    groups[level].push(q);
  }
  return groups;
}

function LevelQuiz({
  questions,
  learningMinutes,
}: {
  questions: AcademyViewModel["quiz"];
  learningMinutes?: number;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) {
    return (
      <Card className="p-6 text-center shadow-elev-sm">
        <p className="text-sm text-muted-foreground">No questions for this level yet.</p>
      </Card>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="p-8 text-center shadow-elev-sm">
        <CheckCircle2 className="size-12 mx-auto text-success mb-3" />
        <h3 className="font-semibold text-lg">Level complete</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {score} of {questions.length} correct ({pct}%)
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => {
            setIndex(0);
            setPicked(null);
            setScore(0);
            setDone(false);
          }}
        >
          Retake level
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
        {index + 1 >= questions.length ? "Finish level" : "Next question"}
      </Button>
    </Card>
  );
}

export function ServiceLibraryQuiz({ questions, learningMinutes }: Props) {
  const grouped = useMemo(() => groupByLevel(questions), [questions]);
  const defaultLevel = ([1, 2, 3] as QuizLevel[]).find((l) => grouped[l].length > 0) ?? 1;

  if (!questions.length) {
    return (
      <Card className="p-8 text-center shadow-elev-sm">
        <Brain className="size-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold">Knowledge check</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Add quiz questions in Service Library Admin → Service content (JSON: <code>quiz</code> array with{" "}
          <code>level</code> 1–3).
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2 flex-wrap">
        <Brain className="size-5 text-primary" />
        <h3 className="font-semibold">Knowledge check</h3>
        <Badge variant="secondary">{questions.length} questions</Badge>
      </div>
      <Tabs defaultValue={String(defaultLevel)}>
        <TabsList className="grid w-full grid-cols-3">
          {([1, 2, 3] as QuizLevel[]).map((level) => (
            <TabsTrigger key={level} value={String(level)} className="text-xs sm:text-sm">
              {LEVEL_META[level].label}
              <span className="ml-1 text-muted-foreground">({grouped[level].length})</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {([1, 2, 3] as QuizLevel[]).map((level) => (
          <TabsContent key={level} value={String(level)} className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">{LEVEL_META[level].hint}</p>
            <LevelQuiz questions={grouped[level]} learningMinutes={learningMinutes} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
