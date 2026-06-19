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

  it("renders language exam type in view mode", () => {
    render(
      <TestScoreBlock
        mode="view"
        language={{
          test_id: "french",
          status: "scheduled",
          cefr_level: null,
          exam_type: "TEF",
          overall_score: null,
          test_date: null,
          expiry_date: null,
          sections: {},
          linked_documents: [],
        }}
      />,
    );
    expect(screen.getByText("French")).toBeInTheDocument();
    expect(screen.getByText("TEF")).toBeInTheDocument();
  });
});
