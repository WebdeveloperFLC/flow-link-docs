import type { ProfileEditState, ProfileSectionId, ProfileViewModel } from "@/lib/profile/types";

function cloneIdentity(vm: ProfileViewModel): ProfileEditState["identity"] {
  return { ...vm.identity };
}

function cloneContact(vm: ProfileViewModel): ProfileEditState["contact"] {
  return { ...vm.contact };
}

function cloneTests(vm: ProfileViewModel): ProfileEditState["tests"] {
  return {
    active_english_test: vm.tests.active_english_test,
    english: vm.tests.english.map((e) => ({
      ...e,
      sections: { ...e.sections },
      linked_documents: e.linked_documents.map((d) => ({ ...d })),
    })),
    aptitude: vm.tests.aptitude.map((a) => ({
      ...a,
      sections: { ...a.sections },
      linked_documents: a.linked_documents.map((d) => ({ ...d })),
    })),
    language: vm.tests.language.map((l) => ({
      ...l,
      sections: { ...l.sections },
      linked_documents: l.linked_documents.map((d) => ({ ...d })),
    })),
  };
}

function cloneEducation(vm: ProfileViewModel): ProfileEditState["education"] {
  return vm.education.map((e) => ({
    ...e,
    linked_documents: e.linked_documents.map((d) => ({ ...d })),
  }));
}

function cloneExperience(vm: ProfileViewModel): ProfileEditState["experience"] {
  return vm.experience.map((e) => ({
    ...e,
    linked_documents: e.linked_documents.map((d) => ({ ...d })),
  }));
}

export interface ToEditStateOptions {
  activeSection?: ProfileSectionId;
}

/**
 * Create mutable write model from immutable read model.
 * UI-only fields start at defaults; domain data is deep-cloned.
 */
export function toEditState(vm: ProfileViewModel, options: ToEditStateOptions = {}): ProfileEditState {
  return {
    clientId: vm.meta.client_id,
    activeSection: options.activeSection ?? "identity",
    editingSection: null,
    selectedEnglishTest: vm.tests.active_english_test,
    selectedAptitudeTest: vm.tests.aptitude[0]?.test_type ?? null,
    selectedLanguage: vm.tests.language[0]?.language ?? null,
    expandedEducationId: vm.education[0]?.id ?? null,
    expandedExperienceId: vm.experience[0]?.id ?? null,
    identity: cloneIdentity(vm),
    contact: cloneContact(vm),
    tests: cloneTests(vm),
    education: cloneEducation(vm),
    experience: cloneExperience(vm),
    dirtyFields: [],
    validationErrors: {},
    uploadProgress: {},
  };
}
