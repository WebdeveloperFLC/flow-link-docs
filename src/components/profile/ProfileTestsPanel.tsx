import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TestAttemptForm } from "@/components/profile/TestAttemptForm";
import { TestAttemptList } from "@/components/profile/TestAttemptList";
import type { LinkedDocumentOption } from "@/components/profile/LinkedDocumentsPanel";
import {
  defaultAttemptIdForTest,
} from "@/lib/profile/testAttempts";
import {
  APTITUDE_TEST_IDS,
  ENGLISH_TEST_IDS,
  LANGUAGE_TEST_IDS,
  testLabel,
} from "@/lib/profile/profileTestCatalog";
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
  selectedAttemptId?: string | null;
  availableDocuments?: LinkedDocumentOption[];
  onSelectEnglish?: (testId: ProfileEnglishTestId) => void;
  onSelectAptitude?: (testId: ProfileAptitudeTestId) => void;
  onSelectLanguage?: (testId: ProfileLanguageTestId) => void;
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

function TestTypeSection({
  title,
  category,
  testIds,
  selectedTestId,
  activeTypeId,
  attempts,
  activeAttemptIds,
  selectedAttemptId,
  mode,
  availableDocuments,
  onSelectTestType,
  onSelectAttempt,
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
  selectedAttemptId: string | null;
  mode: "view" | "edit";
  availableDocuments?: LinkedDocumentOption[];
  onSelectTestType?: (testId: ProfileTestId) => void;
  onSelectAttempt?: (attemptId: string) => void;
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
  const activeAttemptId = activeAttemptIds[selectedTestId] ?? null;
  const resolvedAttemptId =
    selectedAttemptId &&
    attempts.some((a) => a.attempt_id === selectedAttemptId && a.test_id === selectedTestId)
      ? selectedAttemptId
      : defaultAttemptIdForTest(attempts, activeAttemptIds, selectedTestId);
  const selectedAttempt = attempts.find((a) => a.attempt_id === resolvedAttemptId) ?? null;

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
      <TestAttemptList
        attempts={attempts}
        testId={selectedTestId}
        selectedAttemptId={resolvedAttemptId}
        activeAttemptId={activeAttemptId}
        mode={mode}
        onSelect={onSelectAttempt}
        onSetActive={
          onSetActiveAttempt
            ? (id) => onSetActiveAttempt(selectedTestId, id)
            : undefined
        }
        onRemove={onRemoveAttempt}
      />
      {selectedAttempt ? (
        <TestAttemptForm
          attempt={selectedAttempt}
          mode={mode}
          availableDocuments={availableDocuments}
          onChange={(patch) => onAttemptChange?.(selectedAttempt.attempt_id, patch)}
          onLinkDocument={(docId, slot) =>
            onLinkDocument?.(selectedAttempt.attempt_id, selectedTestId, docId, slot)
          }
          onUnlinkDocument={(docId, slot) =>
            onUnlinkDocument?.(selectedAttempt.attempt_id, selectedTestId, docId, slot)
          }
          onUploadDocument={(file, slot) =>
            onUploadDocument?.(selectedAttempt.attempt_id, selectedTestId, file, slot)
          }
          documentsPlaceholder={documentsPlaceholder}
        />
      ) : mode === "view" ? (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
          No attempts for {testLabel(selectedTestId)} yet.
        </p>
      ) : null}
    </section>
  );
}

export function ProfileTestsPanel({
  mode,
  attempts,
  activeAttemptIds,
  activeEnglishTestId,
  selectedEnglishTestId,
  selectedAptitudeTestId,
  selectedLanguageTestId,
  selectedAttemptId = null,
  availableDocuments,
  onSelectEnglish,
  onSelectAptitude,
  onSelectLanguage,
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
        selectedAttemptId={selectedAttemptId}
        mode={mode}
        availableDocuments={availableDocuments}
        onSelectTestType={(id) => onSelectEnglish?.(id as ProfileEnglishTestId)}
        onSelectAttempt={onSelectAttempt}
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
        selectedAttemptId={selectedAttemptId}
        mode={mode}
        availableDocuments={availableDocuments}
        onSelectTestType={(id) => onSelectAptitude?.(id as ProfileAptitudeTestId)}
        onSelectAttempt={onSelectAttempt}
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
        selectedAttemptId={selectedAttemptId}
        mode={mode}
        availableDocuments={availableDocuments}
        onSelectTestType={(id) => onSelectLanguage?.(id as ProfileLanguageTestId)}
        onSelectAttempt={onSelectAttempt}
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
