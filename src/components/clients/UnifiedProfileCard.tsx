import { useMemo } from "react";
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
import { ensureEducationId, ensureExperienceId, educationRefKey, experienceRefKey, englishTestRefKey } from "@/lib/profile/profileRecordIds";
import { slotLabel } from "@/lib/profile/profileDocumentSlots";
import type {
  ProfileEducationRecord,
  ProfileEnglishTestId,
  ProfileExperienceRecord,
  ProfileLinkedDocument,
  ProfileSectionId,
  ProfileTabId,
  ProfileViewModel,
} from "@/lib/profile/types";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  canEdit?: boolean;
  refreshKey?: number;
  className?: string;
  onSaved?: () => void;
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
  previewViewModel,
  previewDocuments,
}: Props) {
  const isPreview = !!previewViewModel;

  const loaded = useProfileViewModel(isPreview ? null : clientId, refreshKey);
  const viewModel = isPreview ? previewViewModel : loaded.viewModel;
  const previewCompletion = useMemo(
    () => (isPreview && viewModel ? computeCompletion(viewModel) : null),
    [isPreview, viewModel],
  );
  const completion = isPreview ? previewCompletion : loaded.completion;
  const loading = isPreview ? false : loaded.loading;
  const error = isPreview ? null : loaded.error;
  const reload = isPreview ? async () => {} : loaded.reload;

  const editor = useProfileEditor(viewModel, {
    clientId,
    onSaved: async () => {
      await reload();
      onSaved?.();
    },
  });

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
      if (refKey.startsWith("education:")) {
        const id = refKey.split(":")[1];
        next.education = prev.education.map((e) =>
          e.id === id ? { ...e, linked_documents: updater([...e.linked_documents]) } : e,
        );
      } else if (refKey.startsWith("experience:")) {
        const id = refKey.split(":")[1];
        next.experience = prev.experience.map((e) =>
          e.id === id ? { ...e, linked_documents: updater([...e.linked_documents]) } : e,
        );
      } else if (refKey.startsWith("tests:")) {
        const testId = refKey.split(":")[1] as ProfileEnglishTestId;
        next.tests = {
          ...prev.tests,
          english: prev.tests.english.map((e) =>
            e.test_id === testId ? { ...e, linked_documents: updater([...e.linked_documents]) } : e,
          ),
        };
      }
      return next;
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
            activeEnglishTestId={es.tests.active_english_test_id}
            english={isEditing("tests") ? es.tests.english : viewModel.tests.english}
            aptitude={isEditing("tests") ? es.tests.aptitude : viewModel.tests.aptitude}
            language={isEditing("tests") ? es.tests.language : viewModel.tests.language}
            selectedEnglishTestId={es.selectedEnglishTestId}
            selectedAptitudeTestId={es.selectedAptitudeTestId}
            selectedLanguageTestId={es.selectedLanguageTestId}
            availableDocuments={docOptions}
            onSelectEnglish={(id) => editor.patchEditState({ selectedEnglishTestId: id })}
            onSelectAptitude={(id) => editor.patchEditState({ selectedAptitudeTestId: id })}
            onSelectLanguage={(id) => editor.patchEditState({ selectedLanguageTestId: id })}
            onSetActiveEnglish={(id) =>
              editor.patchEditState({
                tests: { ...es.tests, active_english_test_id: id },
                selectedEnglishTestId: id,
              })
            }
            onEnglishChange={(testId, patch) =>
              editor.patchEditState({
                tests: {
                  ...es.tests,
                  english: es.tests.english.map((e) =>
                    e.test_id === testId ? { ...e, ...patch, sections: { ...e.sections, ...(patch.sections ?? {}) } } : e,
                  ),
                },
              })
            }
            onAptitudeChange={(testId, patch) =>
              editor.patchEditState({
                tests: {
                  ...es.tests,
                  aptitude: es.tests.aptitude.map((a) =>
                    a.test_id === testId ? { ...a, ...patch } : a,
                  ),
                },
              })
            }
            onLanguageChange={(testId, patch) =>
              editor.patchEditState({
                tests: {
                  ...es.tests,
                  language: es.tests.language.map((l) =>
                    l.test_id === testId ? { ...l, ...patch } : l,
                  ),
                },
              })
            }
            onLinkEnglishDocument={(testId, docId, slot) =>
              linkDocument(englishTestRefKey(testId), docId, slot)
            }
            onUnlinkEnglishDocument={(testId, docId, slot) =>
              unlinkDocument(englishTestRefKey(testId), docId, slot)
            }
            onUploadEnglishDocument={(testId, file, slot) =>
              void uploadDocument(englishTestRefKey(testId), file, slot)
            }
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
        />
      )}

      {isClient360 && <Client360ExecutivePanel viewModel={viewModel} />}
    </Card>
  );
}
