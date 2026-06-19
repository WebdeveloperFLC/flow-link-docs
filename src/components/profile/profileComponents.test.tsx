import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileViewSummaries } from "@/components/profile/ProfileViewSummaries";
import { Client360RegistryPanel } from "@/components/profile/Client360RegistryPanel";
import { LinkedDocumentsPanel } from "@/components/profile/LinkedDocumentsPanel";
import { CLIENT_360_SECTIONS, getClient360Sections } from "@/lib/profile/client360Sections";

describe("ProfileViewSummaries", () => {
  it("renders section headlines and lines", () => {
    render(
      <ProfileViewSummaries
        summaries={[
          { section: "identity", headline: "Priya Sharma", lines: ["DOB: 1998-03-15"] },
        ]}
      />,
    );
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("DOB: 1998-03-15")).toBeInTheDocument();
  });
});

describe("Client360RegistryPanel", () => {
  it("lists all registry sections", () => {
    render(<Client360RegistryPanel sections={CLIENT_360_SECTIONS} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Client Services")).toBeInTheDocument();
    expect(screen.getByText("Activity Log")).toBeInTheDocument();
  });
});

describe("client360Sections registry", () => {
  it("returns phase 1 sections only when filtered", () => {
    const phase1 = getClient360Sections(1);
    expect(phase1.length).toBe(CLIENT_360_SECTIONS.length);
    expect(phase1.every((s) => s.phase === 1)).toBe(true);
  });

  it("profile section maps to profile detail tab", () => {
    const profile = CLIENT_360_SECTIONS.find((s) => s.id === "profile");
    expect(profile?.detailTabId).toBe("profile");
    expect(profile?.readOnly).toBe(true);
  });
});

describe("LinkedDocumentsPanel", () => {
  it("shows empty state in view mode", () => {
    render(<LinkedDocumentsPanel linkedDocuments={[]} scope="education" mode="view" />);
    expect(screen.getByText("No linked documents")).toBeInTheDocument();
  });

  it("shows lead placeholder in edit mode when documentsPlaceholder", () => {
    render(
      <LinkedDocumentsPanel linkedDocuments={[]} scope="education" mode="edit" documentsPlaceholder />,
    );
    expect(screen.getByTestId("lead-document-placeholder")).toBeInTheDocument();
  });

  it("lists linked documents in view mode", () => {
    render(
      <LinkedDocumentsPanel
        linkedDocuments={[
          {
            document_id: "doc-1",
            slot: "transcript",
            label: "Transcript",
            file_name: "transcript.pdf",
          },
        ]}
        scope="education"
        mode="view"
      />,
    );
    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(screen.getByText("transcript.pdf")).toBeInTheDocument();
  });
});
