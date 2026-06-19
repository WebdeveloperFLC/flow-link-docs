import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { UnifiedProfileCard } from "@/components/clients/UnifiedProfileCard";
import {
  createMockProfileViewModel,
  MOCK_PROFILE_PREVIEW_CLIENT_ID,
  MOCK_PROFILE_PREVIEW_DOCUMENTS,
} from "@/lib/profile/mockProfileViewModel";
import type { ProfileSectionId } from "@/lib/profile/types";

/**
 * DEV-only profile preview — mock ProfileViewModel, no Supabase.
 * Query params: ?tab=identity|contact|tests|education|experience|client360&mode=view|edit
 */
export default function ProfilePreviewDevPage() {
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "identity";
  const mode = params.get("mode") ?? "view";
  const openLink = params.get("openLink") === "1";

  const vm = createMockProfileViewModel();

  useEffect(() => {
    document.title = `Profile Preview — ${tab}${mode === "edit" ? " (edit)" : ""}`;
  }, [tab, mode]);

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <p className="text-xs text-muted-foreground mb-4">
        DEV preview · mock client · no Supabase · tab={tab} mode={mode}
      </p>
      <UnifiedProfileCard
        clientId={MOCK_PROFILE_PREVIEW_CLIENT_ID}
        canEdit={mode === "edit"}
        previewViewModel={vm}
        previewDocuments={MOCK_PROFILE_PREVIEW_DOCUMENTS}
      />
      <ProfilePreviewBoot tab={tab} mode={mode} openLink={openLink} />
    </div>
  );
}

/** Applies URL-driven tab/mode after mount via DOM clicks (screenshot harness). */
function ProfilePreviewBoot({
  tab,
  mode,
  openLink,
}: {
  tab: string;
  mode: string;
  openLink: boolean;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      const tabBtn = document.querySelector(`[data-testid="profile-tab-${tab}"]`) as HTMLButtonElement | null;
      tabBtn?.click();
      if (mode === "edit" && tab !== "client360") {
        const editBtn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Edit"),
        ) as HTMLButtonElement | undefined;
        editBtn?.click();
      }
      if (openLink && tab === "education") {
        const linkBtn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.trim().startsWith("Link"),
        ) as HTMLButtonElement | undefined;
        linkBtn?.click();
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [tab, mode, openLink]);

  return null;
}

export type ProfilePreviewTab = ProfileSectionId | "client360";
