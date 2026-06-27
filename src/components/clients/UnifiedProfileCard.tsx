import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { useProfileViewModel, useProfileEditor, useProfileDocuments } from "@/hooks/profile";
import {
  ProfileTabNav,
  ProfileMetaBar,
  ProfileCompletionBadge,
  ProfileViewSummaries,
  ProfileServicesBlock,
  ProfileIdentityPanel,
  ProfileContactPanel,
  ProfileTestsPanel,
  ProfileEducationPanel,
  ProfileExperiencePanel,
  Client360ExecutivePanel,
  sectionTitle,
} from "@/components/profile";
import type { LinkedDocumentOption } from "@/components/profile/LinkedDocumentsPanel";
import { summarizeProfile } from "@/lib/profile/summarizeProfile";
import { computeCompletion } from "@/lib/profile/profileCompletion";
import { ensureEducationId, ensureExperienceId, educationRefKey, experienceRefKey, parseRefKey, testAttemptRefKey } from "@/lib/profile/profileRecordIds";
import { createEmptyAttempt, deriveLegacyTestsFromAttempts } from "@/lib/profile/testAttempts";
import { slotLabel } from "@/lib/profile/profileDocumentSlots";
import { formatProfileSaveError } from "@/lib/profile/profileSaveError";
import type {
  ProfileEducationRecord,
  ProfileEnglishTestId,
  ProfileExperienceRecord,
  ProfileLinkedDocument,
  ProfileSectionId,
  ProfileTabId,
  ProfileTestId,
  ProfileViewModel,
  TestAttempt,
} from "@/lib/profile/types";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  canEdit?: boolean;
  refreshKey?: number;
  className?: string;
  onSaved?: () => void;
  /** Called with refreshed view model after a successful save (e.g. sync Overview tab client fields). */
  onProfileSaved?: (viewModel: ProfileViewModel) => void;
  /** Dev preview only — bypasses Supabase loaders */
  previewViewModel?: ProfileViewModel;
  previewDocuments?: LinkedDocumentOption[];
}

export function UnifiedProfileCard({
  clientId,
  canEdit = false,
  refreshKey = 0,
  className,
  onSaved,
  onProfileSaved,
  previewViewModel,
  previewDocuments,
}: Props) {
  const isPreview = !!previewViewModel;

  const loaded = useProfileViewModel(isPreview ? null : clientId, refreshKey);
  const viewModel = isPreview ? previewViewModel : loaded.viewModel;
  const applyViewModel = loaded.applyViewModel;
  const previewCompletion = useMemo(
    () => (isPreview && viewModel ? computeCompletion(viewModel) : null),
    [isPreview, viewModel],
  );
  const completion = isPreview ? previewCompletion : loaded.completion;
  const loading = isPreview ? false : loaded.loading;
  const error = isPreview ? null : loaded.error;

  const editor = useProfileEditor(viewModel, {
    clientId,
    onViewModelSaved: (vm) => {
      applyViewModel(vm);
      onProfileSaved?.(vm);
    },
    onSaved,
  });

  const [docUploading, setDocUploading] = useState(false);

  const liveDocs = useProfileDocuments(isPreview ? null : clientId);
  const documents = isPreview
    ? { documents: previewDocuments ?? [], loading: false, reload: async () => {}, uploadAndLink: async () => null }
    : liveDocs;

  const summaries = useMemo(
    () => (viewModel ? summarizeProfile(viewModel) : []),
    [viewModel],
  );

  const activeSection = editor.editState?.activeSection ?? "identity";
  const editingSection = editor.editingSection;
  const isClient360 = activeSection === "client360";
  const isEditing = (section: ProfileSectionId) => editingSection === section;
  const modeFor = (section: ProfileSectionId): "view" | "edit" =>
    isEditing(section) ? "edit" : "view";

  const patchLinkedDocs = (
    refKey: string,
    updater: (docs: ProfileLinkedDocument[]) => ProfileLinkedDocument[],
  ) => {
    if (!editor.editState) return;
    editor.patchEditState((prev) => {
      const next = { ...prev };
      const parsed = parseRefKey(refKey);
      if (parsed?.kind === "education") {
        next.education = prev.education.map((e) =>
          e.id === parsed.id ? { ...e, linked_documents: updater([...e.linked_documents]) } : e,
        );
      } else if (parsed?.kind === "experience") {
        next.experience = prev.experience.map((e) =>
          e.id === parsed.id ? { ...e, linked_documents: updater([...e.linked_documents]) } : e,
        );
      } else if (parsed?.kind === "tests") {
        const attemptId = parsed.id;
        const attempts = prev.tests.attempts.map((a) =>
          a.attempt_id === attemptId
            ? { ...a, linked_documents: updater([...a.linked_documents]) }
            : a,
        );
        next.tests = {
          ...prev.tests,
          attempts,
          ...deriveLegacyTestsFromAttempts(attempts, prev.tests.active_attempt_ids),
        };
      }
      return next;
    });
  };

  const patchAttempt = (attemptId: string, patch: Partial<TestAttempt>) => {
    editor.patchEditState((prev) => {
      const attempts = prev.tests.attempts.map((a) =>
        a.attempt_id === attemptId
          ? {
              ...a,
              ...patch,
              sections: { ...a.sections, ...(patch.sections ?? {}) },
            }
          : a,
      );
      return {
        ...prev,
        tests: {
          ...prev.tests,
          attempts,
          ...deriveLegacyTestsFromAttempts(attempts, prev.tests.active_attempt_ids),
        },
      };
    });
  };

  const linkDocument = (refKey: string, documentId: string, slot: string) => {
    const doc = documents.documents.find((d) => d.id === documentId);
    const entry: ProfileLinkedDocument = {
      document_id: documentId,
      slot,
      label: slotLabel(slot),
      file_name: doc?.file_name ?? null,
      linked_at: new Date().toISOString(),
    };
    patchLinkedDocs(refKey, (docs) => {
      const filtered = docs.filter((d) => d.slot !== slot);
      return [...filtered, entry];
    });
  };

  const unlinkDocument = (refKey: string, documentId: string, slot: string) => {
    patchLinkedDocs(refKey, (docs) => docs.filter((d) => !(d.document_id === documentId && d.slot === slot)));
  };

  const uploadDocument = async (refKey: string, file: File, slot: string) => {
    setDocUploading(true);
    try {
      const linked = await documents.uploadAndLink({
        file,
        documentType: "profile_attachment",
        refKey,
        slot,
      });
      if (linked) {
        patchLinkedDocs(refKey, (docs) => {
          const filtered = docs.filter((d) => d.slot !== slot);
          return [...filtered, linked];
        });
        toast.success(`${slotLabel(slot)} uploaded — click Save to keep changes`);
      }
    } catch (e) {
      console.error("[UnifiedProfileCard] document upload failed", e);
      toast.error(formatProfileSaveError(e, "Document upload failed"));
    } finally {
      setDocUploading(false);
    }
  };

  const renderSectionActions = (section: ProfileTabId) => {
    if (section === "client360" || !canEdit) return null;
    if (isEditing(section)) {
      return (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={editor.saving}
            onClick={() => editor.cancelEdit()}
          >
            <X className="size-3.5 mr-1" /> Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={editor.saving}
            onClick={() => void editor.saveSection(section)}
          >
            {editor.saving ? (
              <Loader2 className="size-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="size-3.5 mr-1" />
            )}
            Save
          </Button>
        </div>
      );
    }
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => editor.startEdit(section)}>
        <Pencil className="size-3.5 mr-1" /> Edit
      </Button>
    );
  };

  const handleTabChange = (section: ProfileTabId) => {
    if (editingSection) editor.cancelEdit();
    editor.setActiveSection(section);
  };

  if (loading && !viewModel) {
    return (
      <Card className={cn("p-8 flex items-center justify-center text-muted-foreground", className)} data-testid="unified-profile-card">
        <Loader2 className="size-5 mr-2 animate-spin" /> Loading profile…
      </Card>
    );
  }

  if (error || !viewModel || !editor.editState) {
    return (
      <Card className={cn("p-6 text-sm text-destructive", className)} data-testid="unified-profile-card">
        {error ?? "Profile unavailable"}
      </Card>
    );
  }

  const es = editor.editState;
  const docOptions = documents.documents.map((d) => ({
    id: d.id,
    file_name: d.file_name,
    document_type: d.document_type,
  }));

  return (
    <Card className={cn("p-4 md:p-6 space-y-4", className)} data-testid="unified-profile-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">
            {viewModel.identity.full_name ?? "Client profile"}
          </h3>
          <ProfileMetaBar meta={viewModel.meta} />
        </div>
        {completion && (
          <ProfileCompletionBadge
            filled={completion.overall.filled}
            total={completion.overall.total}
            className="shrink-0"
          />
        )}
      </div>

      <div data-testid="profile-services-block">
        <ProfileServicesBlock services={viewModel.services} />
      </div>

      <ProfileTabNav
        activeSection={activeSection}
        sections={completion?.sections}
        onChange={handleTabChange}
      />

      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{sectionTitle(activeSection)}</h4>
        {renderSectionActions(activeSection)}
      </div>

      {activeSection === "identity" && (
        isEditing("identity") ? (
          <ProfileIdentityPanel
            identity={es.identity}
            mode="edit"
            onPatch={(patch) => editor.patchEditState({ identity: { ...es.identity, ...patch } })}
          />
        ) : (
          <ProfileViewSummaries
            summaries={summaries.filter((s) => s.section === "identity")}
            activeSection="identity"
          />
        )
      )}

      {activeSection === "contact" && (
        isEditing("contact") ? (
          <ProfileContactPanel
            contact={es.contact}
            mode="edit"
            onPatch={(patch) => editor.patchEditState({ contact: { ...es.contact, ...patch } })}
          />
        ) : (
          <ProfileViewSummaries
            summaries={summaries.filter((s) => s.section === "contact")}
            activeSection="contact"
          />
        )
      )}

      {activeSection === "tests" && (
        <div data-testid="profile-section-tests">
          <ProfileTestsPanel
            mode={modeFor("tests")}
            attempts={isEditing("tests") ? es.tests.attempts : viewModel.tests.attempts}
            activeAttemptIds={
              isEditing("tests") ? es.tests.active_attempt_ids : viewModel.tests.active_attempt_ids
            }
            activeEnglishTestId={es.tests.active_english_test_id}
            selectedEnglishTestId={es.selectedEnglishTestId}
            selectedAptitudeTestId={es.selectedAptitudeTestId}
            selectedLanguageTestId={es.selectedLanguageTestId}
            expandedAttemptId={es.selectedAttemptId}
            availableDocuments={docOptions}
            onSelectEnglish={(id) =>
              editor.patchEditState({ selectedEnglishTestId: id, selectedAttemptId: null })
            }
            onSelectAptitude={(id) =>
              editor.patchEditState({ selectedAptitudeTestId: id, selectedAttemptId: null })
            }
            onSelectLanguage={(id) =>
              editor.patchEditState({ selectedLanguageTestId: id, selectedAttemptId: null })
            }
            onExpandAttempt={(id) => editor.patchEditState({ selectedAttemptId: id })}
            onAddAttempt={(testId) => {
              const empty = createEmptyAttempt(testId);
              editor.patchEditState((prev) => {
                const attempts = [...prev.tests.attempts, empty];
                const active_attempt_ids = {
                  ...prev.tests.active_attempt_ids,
                  ...(prev.tests.active_attempt_ids[testId]
                    ? {}
                    : { [testId]: empty.attempt_id }),
                };
                const isEnglish = (["ielts", "pte", "toefl", "celpip", "duolingo"] as const).includes(
                  testId as ProfileEnglishTestId,
                );
                return {
                  ...prev,
                  selectedAttemptId: empty.attempt_id,
                  tests: {
                    ...prev.tests,
                    attempts,
                    active_attempt_ids,
                    active_english_test_id: isEnglish
                      ? (testId as ProfileEnglishTestId)
                      : prev.tests.active_english_test_id,
                    ...deriveLegacyTestsFromAttempts(attempts, active_attempt_ids),
                  },
                };
              });
            }}
            onRemoveAttempt={(attemptId) => {
              editor.patchEditState((prev) => {
                const removed = prev.tests.attempts.find((a) => a.attempt_id === attemptId);
                const attempts = prev.tests.attempts.filter((a) => a.attempt_id !== attemptId);
                const active_attempt_ids = { ...prev.tests.active_attempt_ids };
                if (removed && active_attempt_ids[removed.test_id] === attemptId) {
                  const remaining = attempts.filter((a) => a.test_id === removed.test_id);
                  if (remaining.length) {
                    active_attempt_ids[removed.test_id] = remaining[remaining.length - 1]!.attempt_id;
                  } else {
                    delete active_attempt_ids[removed.test_id];
                  }
                }
                return {
                  ...prev,
                  selectedAttemptId:
                    prev.selectedAttemptId === attemptId ? null : prev.selectedAttemptId,
                  tests: {
                    ...prev.tests,
                    attempts,
                    active_attempt_ids,
                    ...deriveLegacyTestsFromAttempts(attempts, active_attempt_ids),
                  },
                };
              });
            }}
            onSetActiveAttempt={(testId, attemptId) => {
              editor.patchEditState((prev) => {
                const active_attempt_ids = {
                  ...prev.tests.active_attempt_ids,
                  [testId]: attemptId,
                };
                const isEnglish = (["ielts", "pte", "toefl", "celpip", "duolingo"] as const).includes(
                  testId as ProfileEnglishTestId,
                );
                return {
                  ...prev,
                  tests: {
                    ...prev.tests,
                    active_attempt_ids,
                    active_english_test_id: isEnglish
                      ? (testId as ProfileEnglishTestId)
                      : prev.tests.active_english_test_id,
                    ...deriveLegacyTestsFromAttempts(prev.tests.attempts, active_attempt_ids),
                  },
                };
              });
            }}
            onSetActiveEnglishType={(id) =>
              editor.patchEditState({
                tests: { ...es.tests, active_english_test_id: id },
                selectedEnglishTestId: id,
              })
            }
            onAttemptChange={(attemptId, patch) => patchAttempt(attemptId, patch)}
            onLinkAttemptDocument={(attemptId, testId, docId, slot) =>
              linkDocument(testAttemptRefKey(testId, attemptId), docId, slot)
            }
            onUnlinkAttemptDocument={(attemptId, testId, docId, slot) =>
              unlinkDocument(testAttemptRefKey(testId, attemptId), docId, slot)
            }
            onUploadAttemptDocument={(attemptId, testId, file, slot) =>
              void uploadDocument(testAttemptRefKey(testId, attemptId), file, slot)
            }
            docUploading={docUploading}
          />
        </div>
      )}

      {activeSection === "education" && (
        <div data-testid="profile-section-education">
          <ProfileEducationPanel
            records={isEditing("education") ? es.education : viewModel.education}
            mode={modeFor("education")}
            expandedId={es.expandedEducationId}
            availableDocuments={docOptions}
            onExpand={(id) => editor.patchEditState({ expandedEducationId: id })}
            onAdd={() => {
              const id = ensureEducationId();
              const record: ProfileEducationRecord = {
                id,
                qualification_type: null,
                institution_name: null,
                country: null,
                state_province: null,
                city: null,
                field_of_study: null,
                major: null,
                start_year: null,
                end_year: null,
                status: null,
                grade_type: null,
                score: null,
                backlogs: null,
                notes: null,
                linked_documents: [],
              };
              editor.patchEditState({
                education: [...es.education, record],
                expandedEducationId: id,
              });
            }}
            onRemove={(id) =>
              editor.patchEditState({
                education: es.education.filter((e) => e.id !== id),
              })
            }
            onPatch={(id, patch) =>
              editor.patchEditState({
                education: es.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
              })
            }
            onLinkDocument={(recordId, docId, slot) =>
              linkDocument(educationRefKey(recordId), docId, slot)
            }
            onUnlinkDocument={(recordId, docId, slot) =>
              unlinkDocument(educationRefKey(recordId), docId, slot)
            }
            onUploadDocument={(recordId, file, slot) =>
              void uploadDocument(educationRefKey(recordId), file, slot)
            }
            docUploading={docUploading}
          />
        </div>
      )}

      {activeSection === "experience" && (
        <ProfileExperiencePanel
          records={isEditing("experience") ? es.experience : viewModel.experience}
          mode={modeFor("experience")}
          expandedId={es.expandedExperienceId}
          availableDocuments={docOptions}
          onExpand={(id) => editor.patchEditState({ expandedExperienceId: id })}
          onAdd={() => {
            const id = ensureExperienceId();
            const record: ProfileExperienceRecord = {
              id,
              company: null,
              country: null,
              state_province: null,
              city: null,
              designation: null,
              department: null,
              employment_type: null,
              start_date: null,
              end_date: null,
              currently_working: false,
              notes: null,
              linked_documents: [],
            };
            editor.patchEditState({
              experience: [...es.experience, record],
              expandedExperienceId: id,
            });
          }}
          onRemove={(id) =>
            editor.patchEditState({
              experience: es.experience.filter((e) => e.id !== id),
            })
          }
          onPatch={(id, patch) =>
            editor.patchEditState({
              experience: es.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)),
            })
          }
          onLinkDocument={(recordId, docId, slot) =>
            linkDocument(experienceRefKey(recordId), docId, slot)
          }
          onUnlinkDocument={(recordId, docId, slot) =>
            unlinkDocument(experienceRefKey(recordId), docId, slot)
          }
          onUploadDocument={(recordId, file, slot) =>
            void uploadDocument(experienceRefKey(recordId), file, slot)
          }
          docUploading={docUploading}
        />
      )}

      {isClient360 && <Client360ExecutivePanel viewModel={viewModel} />}
    </Card>
  );
}
