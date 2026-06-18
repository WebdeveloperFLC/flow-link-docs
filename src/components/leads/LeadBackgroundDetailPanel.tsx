import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import {
  buildBackgroundDetailView,
  type BackgroundDetailView,
  type EnglishTestDetailView,
  type LeadBackgroundState,
  type ScoreChip,
} from "@/lib/leadBackground";
import { cn } from "@/lib/utils";

interface Props {
  background: LeadBackgroundState;
  className?: string;
}

function ScoreRow({ chips }: { chips: ScoreChip[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-md bg-background border px-2 py-0.5 text-xs"
        >
          <span className="text-muted-foreground">{chip.label}</span>
          <span className="font-medium tabular-nums">{chip.value}</span>
        </span>
      ))}
    </div>
  );
}

function MetaLine({ items }: { items: (string | undefined)[] }) {
  const text = items.filter(Boolean).join(" · ");
  if (!text) return null;
  return <p className="text-xs text-muted-foreground mt-1">{text}</p>;
}

function EnglishCard({ test }: { test: EnglishTestDetailView }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{test.test}</span>
        {test.status && (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {test.status}
          </Badge>
        )}
        {test.overall && (
          <span className="text-sm">
            Overall <span className="font-semibold tabular-nums">{test.overall}</span>
          </span>
        )}
      </div>
      <MetaLine
        items={[
          test.testDate ? `Test ${test.testDate}` : undefined,
          test.expiry ? `Expires ${test.expiry}` : undefined,
        ]}
      />
      <ScoreRow chips={test.sections} />
    </div>
  );
}

function SectionBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="ml-1.5 font-normal normal-case tracking-normal">({count})</span>
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailContent({ view }: { view: BackgroundDetailView }) {
  return (
    <div className="space-y-5">
      <SectionBlock title="English tests" count={view.english.length}>
        {view.english.map((t) => (
          <EnglishCard key={t.test} test={t} />
        ))}
      </SectionBlock>

      <SectionBlock title="Academic tests" count={view.academic.length}>
        {view.academic.map((t) => (
          <div key={t.type} className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t.type}</span>
              {t.overall && (
                <span className="text-sm">
                  Overall <span className="font-semibold tabular-nums">{t.overall}</span>
                </span>
              )}
            </div>
            <MetaLine items={[t.testDate ? `Test ${t.testDate}` : undefined]} />
            <ScoreRow chips={t.sections} />
          </div>
        ))}
      </SectionBlock>

      <SectionBlock title="Language tests" count={view.language.length}>
        {view.language.map((t) => (
          <div key={t.language} className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t.language}</span>
              {t.status && <Badge variant="secondary" className="text-[10px] font-normal">{t.status}</Badge>}
              {t.cefr && <Badge variant="outline" className="text-[10px] font-normal">{t.cefr}</Badge>}
              {t.exam && <span className="text-xs text-muted-foreground">{t.exam}</span>}
              {t.overall && (
                <span className="text-sm">
                  Overall <span className="font-semibold tabular-nums">{t.overall}</span>
                </span>
              )}
            </div>
            <MetaLine
              items={[
                t.testDate ? `Test ${t.testDate}` : undefined,
                t.expiry ? `Expires ${t.expiry}` : undefined,
              ]}
            />
            <ScoreRow chips={t.sections} />
          </div>
        ))}
      </SectionBlock>

      <SectionBlock title="Education" count={view.education.length}>
        {view.education.map((line, i) => (
          <div key={i} className="rounded-lg border bg-background px-3 py-2 text-sm">
            {line}
          </div>
        ))}
      </SectionBlock>

      <SectionBlock title="Experience" count={view.experience.length}>
        {view.experience.map((line, i) => (
          <div key={i} className="rounded-lg border bg-background px-3 py-2 text-sm">
            {line}
          </div>
        ))}
      </SectionBlock>
    </div>
  );
}

export function LeadBackgroundDetailPanel({ background, className }: Props) {
  const view = buildBackgroundDetailView(background);
  const hasAny =
    view.english.length > 0 ||
    view.academic.length > 0 ||
    view.language.length > 0 ||
    view.education.length > 0 ||
    view.experience.length > 0;

  if (!hasAny) return null;

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-4", className)}>
      <DetailContent view={view} />
    </div>
  );
}
