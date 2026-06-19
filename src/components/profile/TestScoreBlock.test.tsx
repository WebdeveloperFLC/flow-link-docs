import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestScoreBlock } from "@/components/profile/TestScoreBlock";

describe("TestScoreBlock", () => {
  it("renders IELTS view with variant and overall", () => {
    render(
      <TestScoreBlock
        mode="view"
        english={{
          test_id: "ielts",
          status: "taken",
          overall: "7.5",
          test_date: null,
          test_expiry: null,
          sections: { listening: "8.0", reading: "7.5" },
          ielts_variant: "Academic",
          country: null,
          linked_documents: [],
        }}
      />,
    );
    expect(screen.getByText("IELTS")).toBeInTheDocument();
    expect(screen.getByText("Academic")).toBeInTheDocument();
    expect(screen.getByText(/Overall/)).toBeInTheDocument();
    expect(screen.getAllByText("7.5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("8.0")).toBeInTheDocument();
  });

  it("renders aptitude overall in view mode", () => {
    render(
      <TestScoreBlock
        mode="view"
        aptitude={{
          test_id: "gre",
          status: "taken",
          overall: "320",
          test_date: null,
          sections: { quant: "165" },
          linked_documents: [],
        }}
      />,
    );
    expect(screen.getByText("GRE")).toBeInTheDocument();
    expect(screen.getByText("320")).toBeInTheDocument();
  });

  it("renders sectional score inputs in english edit mode", () => {
    render(
      <TestScoreBlock
        mode="edit"
        english={{
          test_id: "ielts",
          status: null,
          overall: null,
          test_date: null,
          test_expiry: null,
          sections: {},
          ielts_variant: null,
          country: null,
          linked_documents: [],
        }}
        onEnglishChange={() => {}}
      />,
    );
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Writing")).toBeInTheDocument();
    expect(screen.getByText("Speaking")).toBeInTheDocument();
  });

  it("renders GRE sectional inputs in aptitude edit mode", () => {
    render(
      <TestScoreBlock
        mode="edit"
        aptitude={{
          test_id: "gre",
          status: null,
          overall: null,
          test_date: null,
          sections: {},
          linked_documents: [],
        }}
        onAptitudeChange={() => {}}
      />,
    );
    expect(screen.getByText("Verbal")).toBeInTheDocument();
    expect(screen.getByText("Quant")).toBeInTheDocument();
    expect(screen.getByText("AWA")).toBeInTheDocument();
  });
});
