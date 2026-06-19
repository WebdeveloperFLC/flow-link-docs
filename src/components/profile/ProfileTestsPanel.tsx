import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TestAttemptForm } from "@/components/profile/TestAttemptForm";
import { ProfileRecordCardHeader } from "@/components/profile/ProfileRecordCardHeader";
import type { LinkedDocumentOption } from "@/components/profile/LinkedDocumentsPanel";
import {
  APTITUDE_TEST_IDS,
  ENGLISH_TEST_IDS,
  LANGUAGE_TEST_IDS,
  testLabel,
} from "@/lib/profile/profileTestCatalog";
import {
  formatAttemptCardHeadline,
  formatAttemptCardPreview,
} from "@/lib/profile/recordCardPreview";
import { attemptsForTestId, sortAttemptsChronologically } from "@/lib/profile/testAttempts";
import { statusLabel } from "@/lib/profile/testAttemptFormRules";
import type {
  ProfileAptitudeTestId,
  ProfileEnglishTestId,
  ProfileLanguageTestId,
  ProfileTestCategory,
  ProfileTestId,
  TestAttempt,
} from "@/lib/profile/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Props {
  mode: "view" | "edit";
  attempts: readonly TestAttempt[];
  activeAttemptIds: Readonly<Partial<Record<ProfileTestId, string>>>;
  activeEnglishTestId: ProfileEnglishTestId | null;
  selectedEnglishTestId?: ProfileEnglishTestId | null;
  selectedAptitudeTestId?: ProfileAptitudeTestId | null;
  selectedLanguageTestId?: ProfileLanguageTestId | null;
  /** Expanded attempt card (collapsible editor). Alias: selectedAttemptId. */
  expandedAttemptId?: string | null;
  /** @deprecated use expandedAttemptId */
  selectedAttemptId?: string | null;
  availableDocuments?: LinkedDocumentOption[];
  onSelectEnglish?: (testId: ProfileEnglishTestId) => void;
  onSelectAptitude?: (testId: ProfileAptitudeTestId) => void;
  onSelectLanguage?: (testId: ProfileLanguageTestId) => void;
  onExpandAttempt?: (attemptId: string | null) => void;
  /** @deprecated use onExpandAttempt */
  onSelectAttempt?: (attemptId: string) => void;
  onAddAttempt?: (testId: ProfileTestId) => void;
  onRemoveAttempt?: (attemptId: string) => void;
  onSetActiveAttempt?: (testId: ProfileTestId, attemptId: string) => void;
  onSetActiveEnglishType?: (testId: ProfileEnglishTestId) => void;
  onAttemptChange?: (attemptId: string, patch: Partial<TestAttempt>) => void;
  onLinkAttemptDocument?: (attemptId: string, testId: ProfileTestId, docId: string, slot: string) => void;
  onUnlinkAttemptDocument?: (attemptId: string, testId: ProfileTestId, docId: string, slot: string) => void;
  onUploadAttemptDocument?: (attemptId: string, testId: ProfileTestId, file: File, slot: string) => void;
  documentsPlaceholder?: boolean;
  className?: string;
}

function TestPills<T extends string>({
  ids,
  selected,
  activeTypeId,
  onSelect,
  labelFor,
}: {
  ids: readonly T[];
  selected: T | null | undefined;
  activeTypeId?: T | null;
  onSelect?: (id: T) => void;
  labelFor: (id: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const isSelected = selected === id;
        const isActiveType = activeTypeId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect?.(id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent",
            )}
          >
            {labelFor(id)}
            {isActiveType && (
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                Primary
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TestAttemptCards({
  testId,
  category,
  attempts,
  activeAttemptIds,
  activeEnglishTestId,
  expandedAttemptId,
  mode,
  availableDocuments,
  onExpandAttempt,
  onRemoveAttempt,
  onSetActiveAttempt,
  onAttemptChange,
  onLinkDocument,
  onUnlinkDocument,
  onUploadDocument,
  documentsPlaceholder,
}: {
  testId: ProfileTestId;
  category: ProfileTestCategory;
  attempts: readonly TestAttempt[];
  activeAttemptIds: Readonly<Partial<Record<ProfileTestId, string>>>;
  activeEnglishTestId?: ProfileEnglishTestId | null;
  expandedAttemptId: string | null;
  mode: "view" | "edit";
  availableDocuments?: LinkedDocumentOption[];
  onExpandAttempt?: (attemptId: string | null) => void;
  onRemoveAttempt?: (attemptId: string) => void;
  onSetActiveAttempt?: (testId: ProfileTestId, attemptId: string) => void;
  onAttemptChange?: (attemptId: string, patch: Partial<TestAttempt>) => void;
  onLinkDocument?: (attemptId: string, testId: ProfileTestId, docId: string, slot: string) => void;
  onUnlinkDocument?: (attemptId: string, testId: ProfileTestId, docId: string, slot: string) => void;
  onUploadDocument?: (attemptId: string, testId: ProfileTestId, file: File, slot: string) => void;
  documentsPlaceholder?: boolean;
}) {
  const activeAttemptId = activeAttemptIds?.[testId] ?? null;
  const forType = sortAttemptsChronologically(attemptsForTestId(attempts, testId));

  if (forType.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
        No attempts yet. {mode === "edit" ? "Click Add attempt to record a test." : ""}
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid={`attempt-list-${testId}`}>
      {forType.map((attempt, index) => {
        const expanded = expandedAttemptId === attempt.attempt_id;
        const isActive = activeAttemptId === attempt.attempt_id;
        const isPrimaryEnglish = category === "english" && activeEnglishTestId === testId;
        const badges = [
          attempt.status
            ? { label: statusLabel(attempt.status), variant: "secondary" as const }
            : null,
          isPrimaryEnglish ? { label: "Primary", variant: "outline" as const } : null,
          isActive ? { label: "Active", variant: "default" as const } : null,
        ].filter(Boolean) as { label: string; variant: "default" | "secondary" | "outline" }[];

        return (
          <div
            key={attempt.attempt_id}
            className={cn(
              "rounded-lg border bg-muted/10",
              expanded ? "p-3 space-y-3" : "p-2.5",
            )}
          >
            <ProfileRecordCardHeader
              headline={formatAttemptCardHeadline(attempt, index)}
              preview={formatAttemptCardPreview(attempt)}
              expanded={expanded}
              badges={badges}
              onToggle={() => onExpandAttempt?.(expanded ? null : attempt.attempt_id)}
              onRemove={
                mode === "edit" && onRemoveAttempt
                  ? () => onRemoveAttempt(attempt.attempt_id)
                  : undefined
              }
            />
            {expanded && (
              <>
                {mode === "edit" && !isActive && onSetActiveAttempt && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onSetActiveAttempt(testId, attempt.attempt_id)}
                  >
                    Set active
                  </Button>
                )}
                <TestAttemptForm
                  attempt={attempt}
                  mode={mode}
                  availableDocuments={availableDocuments}
                  onChange={(patch) => onAttemptChange?.(attempt.attempt_id, patch)}
                  onLinkDocument={(docId, slot) =>
                    onLinkDocument?.(attempt.attempt_id, testId, docId, slot)
                  }
                  onUnlinkDocument={(docId, slot) =>
                    onUnlinkDocument?.(attempt.attempt_id, testId, docId, slot)
                  }
                  onUploadDocument={(file, slot) =>
                    onUploadDocument?.(attempt.attempt_id, testId, file, slot)
                  }
                  documentsPlaceholder={documentsPlaceholder}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TestTypeSection({
  title,
  category,
  testIds,
  selectedTestId,
  activeTypeId,
  attempts,
  activeAttemptIds,
  expandedAttemptId,
  mode,
  availableDocuments,
  onSelectTestType,
  onExpandAttempt,
  onAddAttempt,
  onRemoveAttempt,
  onSetActiveAttempt,
  onSetActiveType,
  onAttemptChange,
  onLinkDocument,
  onUnlinkDocument,
  onUploadDocument,
  documentsPlaceholder,
  showPrimaryTypeButton,
}: {
  title: string;
  category: ProfileTestCategory;
  testIds: readonly ProfileTestId[];
  selectedTestId: ProfileTestId;
  activeTypeId?: ProfileTestId | null;
  attempts: readonly TestAttempt[];
  activeAttemptIds: Readonly<Partial<Record<ProfileTestId, string>>>;
  expandedAttemptId: string | null;
  mode: "view" | "edit";
  availableDocuments?: LinkedDocumentOption[];
  onSelectTestType?: (testId: ProfileTestId) => void;
  onExpandAttempt?: (attemptId: string | null) => void;
  onAddAttempt?: (testId: ProfileTestId) => void;
  onRemoveAttempt?: (attemptId: string) => void;
  onSetActiveAttempt?: (testId: ProfileTestId, attemptId: string) => void;
  onSetActiveType?: (testId: ProfileTestId) => void;
  onAttemptChange?: (attemptId: string, patch: Partial<TestAttempt>) => void;
  onLinkDocument?: (attemptId: string, testId: ProfileTestId, docId: string, slot: string) => void;
  onUnlinkDocument?: (attemptId: string, testId: ProfileTestId, docId: string, slot: string) => void;
  onUploadDocument?: (attemptId: string, testId: ProfileTestId, file: File, slot: string) => void;
  documentsPlaceholder?: boolean;
  showPrimaryTypeButton?: boolean;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{title}</Label>
        <div className="flex gap-2">
          {mode === "edit" && showPrimaryTypeButton && onSetActiveType && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={activeTypeId === selectedTestId}
              onClick={() => onSetActiveType(selectedTestId)}
            >
              Set primary English
            </Button>
          )}
          {mode === "edit" && onAddAttempt && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onAddAttempt(selectedTestId)}
            >
              <Plus className="size-3" />
              Add attempt
            </Button>
          )}
        </div>
      </div>
      <TestPills
        ids={testIds}
        selected={selectedTestId}
        activeTypeId={activeTypeId}
        onSelect={onSelectTestType}
        labelFor={testLabel}
      />
      <TestAttemptCards
        testId={selectedTestId}
        category={category}
        attempts={attempts}
        activeAttemptIds={activeAttemptIds}
        activeEnglishTestId={activeTypeId as ProfileEnglishTestId | null}
        expandedAttemptId={expandedAttemptId}
        mode={mode}
        availableDocuments={availableDocuments}
        onExpandAttempt={onExpandAttempt}
        onRemoveAttempt={onRemoveAttempt}
        onSetActiveAttempt={onSetActiveAttempt}
        onAttemptChange={onAttemptChange}
        onLinkDocument={onLinkDocument}
        onUnlinkDocument={onUnlinkDocument}
        onUploadDocument={onUploadDocument}
        documentsPlaceholder={documentsPlaceholder}
      />
    </section>
  );
}

export function ProfileTestsPanel({
  mode,
  attempts,
  activeAttemptIds = {},
  activeEnglishTestId,
  selectedEnglishTestId,
  selectedAptitudeTestId,
  selectedLanguageTestId,
  expandedAttemptId = null,
  selectedAttemptId = null,
  availableDocuments,
  onSelectEnglish,
  onSelectAptitude,
  onSelectLanguage,
  onExpandAttempt,
  onSelectAttempt,
  onAddAttempt,
  onRemoveAttempt,
  onSetActiveAttempt,
  onSetActiveEnglishType,
  onAttemptChange,
  onLinkAttemptDocument,
  onUnlinkAttemptDocument,
  onUploadAttemptDocument,
  documentsPlaceholder,
  className,
}: Props) {
  const resolvedExpandedId = expandedAttemptId ?? selectedAttemptId ?? null;
  const handleExpand =
    onExpandAttempt ??
    (onSelectAttempt
      ? (id: string | null) => {
          if (id) onSelectAttempt(id);
        }
      : undefined);

  const selEnglish =
    selectedEnglishTestId ?? activeEnglishTestId ?? ENGLISH_TEST_IDS[0];
  const selAptitude = selectedAptitudeTestId ?? APTITUDE_TEST_IDS[0];
  const selLanguage = selectedLanguageTestId ?? LANGUAGE_TEST_IDS[0];

  const handleAdd = (testId: ProfileTestId) => {
    onAddAttempt?.(testId);
  };

  return (
    <div className={cn("space-y-5", className)} data-testid="profile-tests-panel">
      <TestTypeSection
        title="English tests"
        category="english"
        testIds={ENGLISH_TEST_IDS}
        selectedTestId={selEnglish}
        activeTypeId={activeEnglishTestId}
        attempts={attempts}
        activeAttemptIds={activeAttemptIds}
        expandedAttemptId={resolvedExpandedId}
        mode={mode}
        availableDocuments={availableDocuments}
        onSelectTestType={(id) => onSelectEnglish?.(id as ProfileEnglishTestId)}
        onExpandAttempt={handleExpand}
        onAddAttempt={onAddAttempt ? () => handleAdd(selEnglish) : undefined}
        onRemoveAttempt={onRemoveAttempt}
        onSetActiveAttempt={onSetActiveAttempt}
        onSetActiveType={
          onSetActiveEnglishType
            ? (id) => onSetActiveEnglishType(id as ProfileEnglishTestId)
            : undefined
        }
        onAttemptChange={onAttemptChange}
        onLinkDocument={onLinkAttemptDocument}
        onUnlinkDocument={onUnlinkAttemptDocument}
        onUploadDocument={onUploadAttemptDocument}
        documentsPlaceholder={documentsPlaceholder}
        showPrimaryTypeButton
      />

      <div className="border-t pt-4">
        <TestTypeSection
          title="Aptitude tests"
          category="aptitude"
          testIds={APTITUDE_TEST_IDS}
          selectedTestId={selAptitude}
          attempts={attempts}
          activeAttemptIds={activeAttemptIds}
          expandedAttemptId={resolvedExpandedId}
          mode={mode}
          availableDocuments={availableDocuments}
          onSelectTestType={(id) => onSelectAptitude?.(id as ProfileAptitudeTestId)}
          onExpandAttempt={handleExpand}
          onAddAttempt={onAddAttempt ? () => handleAdd(selAptitude) : undefined}
          onRemoveAttempt={onRemoveAttempt}
          onSetActiveAttempt={onSetActiveAttempt}
          onAttemptChange={onAttemptChange}
          onLinkDocument={onLinkAttemptDocument}
          onUnlinkDocument={onUnlinkAttemptDocument}
          onUploadDocument={onUploadAttemptDocument}
          documentsPlaceholder={documentsPlaceholder}
        />
      </div>

      <div className="border-t pt-4">
        <TestTypeSection
          title="Language tests"
          category="language"
          testIds={LANGUAGE_TEST_IDS}
          selectedTestId={selLanguage}
          attempts={attempts}
          activeAttemptIds={activeAttemptIds}
          expandedAttemptId={resolvedExpandedId}
          mode={mode}
          availableDocuments={availableDocuments}
          onSelectTestType={(id) => onSelectLanguage?.(id as ProfileLanguageTestId)}
          onExpandAttempt={handleExpand}
          onAddAttempt={onAddAttempt ? () => handleAdd(selLanguage) : undefined}
          onRemoveAttempt={onRemoveAttempt}
          onSetActiveAttempt={onSetActiveAttempt}
          onAttemptChange={onAttemptChange}
          onLinkDocument={onLinkAttemptDocument}
          onUnlinkDocument={onUnlinkAttemptDocument}
          onUploadDocument={onUploadAttemptDocument}
        />
      </div>
    </div>
  );
}
