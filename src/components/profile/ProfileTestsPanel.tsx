import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestScoreBlock } from "@/components/profile/TestScoreBlock";
import { LinkedDocumentsPanel, type LinkedDocumentOption } from "@/components/profile/LinkedDocumentsPanel";
import {
  APTITUDE_TEST_IDS,
  ENGLISH_TEST_IDS,
  LANGUAGE_TEST_IDS,
  testLabel,
} from "@/lib/profile/profileTestCatalog";
import {
  resolveAptitudeEntry,
  resolveEnglishEntry,
  resolveLanguageEntry,
} from "@/lib/profile/ensureTestCatalog";
import type {
  ProfileAptitudeTestEntry,
  ProfileEnglishTestEntry,
  ProfileLanguageTestEntry,
  ProfileEnglishTestId,
  ProfileAptitudeTestId,
  ProfileLanguageTestId,
} from "@/lib/profile/types";
import { cn } from "@/lib/utils";

interface Props {
  mode: "view" | "edit";
  activeEnglishTestId: ProfileEnglishTestId | null;
  english: readonly ProfileEnglishTestEntry[];
  aptitude: readonly ProfileAptitudeTestEntry[];
  language: readonly ProfileLanguageTestEntry[];
  selectedEnglishTestId?: ProfileEnglishTestId | null;
  selectedAptitudeTestId?: ProfileAptitudeTestId | null;
  selectedLanguageTestId?: ProfileLanguageTestId | null;
  availableDocuments?: LinkedDocumentOption[];
  onSelectEnglish?: (testId: ProfileEnglishTestId) => void;
  onSelectAptitude?: (testId: ProfileAptitudeTestId) => void;
  onSelectLanguage?: (testId: ProfileLanguageTestId) => void;
  onSetActiveEnglish?: (testId: ProfileEnglishTestId) => void;
  onEnglishChange?: (testId: ProfileEnglishTestId, patch: Partial<ProfileEnglishTestEntry>) => void;
  onAptitudeChange?: (testId: ProfileAptitudeTestId, patch: Partial<ProfileAptitudeTestEntry>) => void;
  onLanguageChange?: (testId: ProfileLanguageTestId, patch: Partial<ProfileLanguageTestEntry>) => void;
  onLinkEnglishDocument?: (testId: ProfileEnglishTestId, documentId: string, slot: string) => void;
  onUnlinkEnglishDocument?: (testId: ProfileEnglishTestId, documentId: string, slot: string) => void;
  onUploadEnglishDocument?: (testId: ProfileEnglishTestId, file: File, slot: string) => void;
  className?: string;
}

function TestPills<T extends string>({
  ids,
  selected,
  activeId,
  onSelect,
  labelFor,
}: {
  ids: readonly T[];
  selected: T | null | undefined;
  activeId?: T | null;
  onSelect?: (id: T) => void;
  labelFor: (id: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const isSelected = selected === id;
        const isActive = activeId === id;
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
            {isActive && (
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                Active
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileTestsPanel({
  mode,
  activeEnglishTestId,
  english,
  aptitude,
  language,
  selectedEnglishTestId,
  selectedAptitudeTestId,
  selectedLanguageTestId,
  availableDocuments,
  onSelectEnglish,
  onSelectAptitude,
  onSelectLanguage,
  onSetActiveEnglish,
  onEnglishChange,
  onAptitudeChange,
  onLanguageChange,
  onLinkEnglishDocument,
  onUnlinkEnglishDocument,
  onUploadEnglishDocument,
  className,
}: Props) {
  const selEnglish = selectedEnglishTestId ?? activeEnglishTestId ?? english[0]?.test_id ?? ENGLISH_TEST_IDS[0];
  const selAptitude = selectedAptitudeTestId ?? aptitude[0]?.test_id ?? APTITUDE_TEST_IDS[0];
  const selLanguage = selectedLanguageTestId ?? language[0]?.test_id ?? LANGUAGE_TEST_IDS[0];

  const englishEntry = resolveEnglishEntry(english, selEnglish, mode);
  const aptitudeEntry = resolveAptitudeEntry(aptitude, selAptitude, mode);
  const languageEntry = resolveLanguageEntry(language, selLanguage, mode);

  const emptyHint = (
    <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
      No details captured for {testLabel(selEnglish)} yet. Click Edit to add scores.
    </p>
  );

  return (
    <div className={cn("space-y-5", className)}>
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-semibold">English tests</Label>
          {mode === "edit" && onSetActiveEnglish && selEnglish && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={activeEnglishTestId === selEnglish}
              onClick={() => onSetActiveEnglish(selEnglish)}
            >
              Set as active
            </Button>
          )}
        </div>
        <TestPills
          ids={ENGLISH_TEST_IDS}
          selected={selEnglish}
          activeId={activeEnglishTestId}
          onSelect={onSelectEnglish}
          labelFor={testLabel}
        />
        <TestScoreBlock
          mode={mode}
          english={englishEntry}
          onEnglishChange={(patch) => selEnglish && onEnglishChange?.(selEnglish, patch)}
        />
        {!englishEntry && mode === "view" && emptyHint}
        {englishEntry && (
          <LinkedDocumentsPanel
            linkedDocuments={englishEntry.linked_documents}
            scope="tests"
            mode={mode}
            availableDocuments={availableDocuments}
            onLinkExisting={(docId, slot) =>
              selEnglish && onLinkEnglishDocument?.(selEnglish, docId, slot)
            }
            onUnlink={(docId, slot) =>
              selEnglish && onUnlinkEnglishDocument?.(selEnglish, docId, slot)
            }
            onUpload={(file, slot) =>
              selEnglish && onUploadEnglishDocument?.(selEnglish, file, slot)
            }
          />
        )}
      </section>

      <section className="space-y-2 border-t pt-4">
        <Label className="text-sm font-semibold">Aptitude tests</Label>
        <TestPills
          ids={APTITUDE_TEST_IDS}
          selected={selAptitude}
          onSelect={onSelectAptitude}
          labelFor={testLabel}
        />
        <TestScoreBlock
          mode={mode}
          aptitude={aptitudeEntry}
          onAptitudeChange={(patch) => selAptitude && onAptitudeChange?.(selAptitude, patch)}
        />
        {!aptitudeEntry && mode === "view" && (
          <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
            No details captured for {testLabel(selAptitude)} yet. Click Edit to add scores.
          </p>
        )}
      </section>

      <section className="space-y-2 border-t pt-4">
        <Label className="text-sm font-semibold">Language tests</Label>
        <TestPills
          ids={LANGUAGE_TEST_IDS}
          selected={selLanguage}
          onSelect={onSelectLanguage}
          labelFor={testLabel}
        />
        <TestScoreBlock
          mode={mode}
          language={languageEntry}
          onLanguageChange={(patch) => selLanguage && onLanguageChange?.(selLanguage, patch)}
        />
        {!languageEntry && mode === "view" && (
          <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
            No details captured for {testLabel(selLanguage)} yet. Click Edit to add scores.
          </p>
        )}
      </section>
    </div>
  );
}
