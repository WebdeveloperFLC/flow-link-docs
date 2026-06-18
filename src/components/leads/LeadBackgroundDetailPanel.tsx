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

export type BackgroundSummaryNavigateTarget =
  | { section: "english"; test?: string }
  | { section: "academic" }
  | { section: "language" }
  | { section: "education" }
  | { section: "experience" };

interface Props {
  background: LeadBackgroundState;
  className?: string;
  compact?: boolean;
  onNavigate?: (target: BackgroundSummaryNavigateTarget) => void;
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

function EnglishCard({
  test,
  interactive,
  onClick,
}: {
  test: EnglishTestDetailView;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const Wrapper = interactive ? "button" : "div";
  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-background p-3 text-left w-full",
        interactive && "hover:bg-accent/50 transition-colors cursor-pointer",
      )}
    >
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
    </Wrapper>
  );
}

function SectionBlock({
  title,
  count,
  section,
  interactive,
  onSectionClick,
  children,
}: {
  title: string;
  count: number;
  section: BackgroundSummaryNavigateTarget["section"];
  interactive?: boolean;
  onSectionClick?: (section: BackgroundSummaryNavigateTarget["section"]) => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  const Heading = interactive ? "button" : "h4";
  return (
    <div className="space-y-2">
      <Heading
        type={interactive ? "button" : undefined}
        onClick={interactive ? () => onSectionClick?.(section) : undefined}
        className={cn(
          "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
          interactive && "hover:text-foreground transition-colors cursor-pointer text-left w-full",
        )}
      >
        {title}
        <span className="ml-1.5 font-normal normal-case tracking-normal">({count})</span>
      </Heading>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailContent({
  view,
  interactive,
  onNavigate,
}: {
  view: BackgroundDetailView;
  interactive?: boolean;
  onNavigate?: (target: BackgroundSummaryNavigateTarget) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionBlock
        title="English tests"
        count={view.english.length}
        section="english"
        interactive={interactive}
        onSectionClick={(s) => onNavigate?.({ section: s })}
      >
        {view.english.map((t) => (
          <EnglishCard
            key={t.test}
            test={t}
            interactive={interactive}
            onClick={() => onNavigate?.({ section: "english", test: t.test })}
          />
        ))}
      </SectionBlock>

      <SectionBlock
        title="Academic tests"
        count={view.academic.length}
        section="academic"
        interactive={interactive}
        onSectionClick={(s) => onNavigate?.({ section: s })}
      >
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

      <SectionBlock
        title="Language tests"
        count={view.language.length}
        section="language"
        interactive={interactive}
        onSectionClick={(s) => onNavigate?.({ section: s })}
      >
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

      <SectionBlock
        title="Education"
        count={view.education.length}
        section="education"
        interactive={interactive}
        onSectionClick={(s) => onNavigate?.({ section: s })}
      >
        {view.education.map((entry, i) => (
          <div key={i} className="rounded-lg border bg-background p-3 space-y-1">
            <div className="text-sm font-semibold">{entry.title}</div>
            {entry.details.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">{line}</p>
            ))}
            {entry.location && (
              <p className="text-xs text-muted-foreground pt-1">{entry.location}</p>
            )}
          </div>
        ))}
      </SectionBlock>

      <SectionBlock
        title="Experience"
        count={view.experience.length}
        section="experience"
        interactive={interactive}
        onSectionClick={(s) => onNavigate?.({ section: s })}
      >
        {view.experience.map((entry, i) => (
          <div key={i} className="rounded-lg border bg-background p-3 space-y-1">
            <div className="text-sm font-semibold">{entry.title}</div>
            {entry.dates && <p className="text-xs text-muted-foreground">{entry.dates}</p>}
            {entry.location && <p className="text-xs text-muted-foreground">{entry.location}</p>}
            {entry.description && <p className="text-sm text-muted-foreground">{entry.description}</p>}
          </div>
        ))}
      </SectionBlock>
    </div>
  );
}

export function LeadBackgroundDetailPanel({ background, className, compact, onNavigate }: Props) {
  const view = buildBackgroundDetailView(background);
  const hasAny =
    view.english.length > 0 ||
    view.academic.length > 0 ||
    view.language.length > 0 ||
    view.education.length > 0 ||
    view.experience.length > 0;

  if (!hasAny) return null;

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-4", compact && "p-3", className)}>
      <DetailContent view={view} interactive={!!onNavigate} onNavigate={onNavigate} />
    </div>
  );
}
