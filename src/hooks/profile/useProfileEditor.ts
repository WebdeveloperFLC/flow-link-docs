import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import { profileSave } from "@/lib/profile/profileSave";
import { toEditState } from "@/lib/profile/toEditState";
import type { ProfileEditState, ProfileSectionId, ProfileViewModel } from "@/lib/profile/types";

export interface UseProfileEditorResult {
  editState: ProfileEditState | null;
  editingSection: ProfileSectionId | null;
  saving: boolean;
  startEdit: (section: ProfileSectionId) => void;
  cancelEdit: () => void;
  setActiveSection: (section: ProfileSectionId) => void;
  patchEditState: (patch: Partial<ProfileEditState> | ((prev: ProfileEditState) => ProfileEditState)) => void;
  saveSection: (section: ProfileSectionId) => Promise<boolean>;
  saveAll: () => Promise<boolean>;
}

export function useProfileEditor(
  viewModel: ProfileViewModel | null,
  options: { clientId: string; onSaved?: () => void },
): UseProfileEditorResult {
  const [editState, setEditState] = useState<ProfileEditState | null>(null);
  const [editingSection, setEditingSection] = useState<ProfileSectionId | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!viewModel) return;
    setEditState((prev) =>
      toEditState(viewModel, { activeSection: prev?.activeSection ?? "identity" }),
    );
    setEditingSection(null);
  }, [viewModel]);

  const patchEditState = useCallback(
    (patch: Partial<ProfileEditState> | ((prev: ProfileEditState) => ProfileEditState)) => {
      setEditState((prev) => {
        if (!prev) return prev;
        return typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      });
    },
    [],
  );

  const startEdit = useCallback((section: ProfileSectionId) => {
    setEditingSection(section);
    patchEditState({ activeSection: section, editingSection: section });
  }, [patchEditState]);

  const cancelEdit = useCallback(() => {
    if (viewModel) {
      setEditState(toEditState(viewModel, { activeSection: editState?.activeSection ?? "identity" }));
    }
    setEditingSection(null);
    patchEditState({ editingSection: null });
  }, [viewModel, editState?.activeSection, patchEditState]);

  const setActiveSection = useCallback((section: ProfileSectionId) => {
    patchEditState({ activeSection: section });
  }, [patchEditState]);

  const persist = useCallback(
    async (sections: ProfileSectionId[]): Promise<boolean> => {
      if (!editState || saving) return false;
      setSaving(true);
      try {
        await profileSave(editState, { sections });
        await appendClientActivityLog({
          clientId: options.clientId,
          action: "profile_updated",
          summary: `Profile updated (${sections.join(", ")})`,
        });
        toast.success("Profile saved");
        setEditingSection(null);
        patchEditState({ editingSection: null });
        await options.onSaved?.();
        return true;
      } catch (e) {
        console.error("[useProfileEditor] save failed", e);
        toast.error(e instanceof Error ? e.message : "Failed to save profile");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [editState, saving, options, patchEditState],
  );

  const saveSection = useCallback(
    (section: ProfileSectionId) => persist([section]),
    [persist],
  );

  const saveAll = useCallback(
    () =>
      persist(["identity", "contact", "tests", "education", "experience"]),
    [persist],
  );

  return {
    editState,
    editingSection,
    saving,
    startEdit,
    cancelEdit,
    setActiveSection,
    patchEditState,
    saveSection,
    saveAll,
  };
}
