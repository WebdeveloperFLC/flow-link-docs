import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileTabNav } from "@/components/profile/ProfileTabNav";
import type { ProfileSectionId } from "@/lib/profile/types";

describe("ProfileTabNav", () => {
  it("renders all profile section pills", () => {
    render(<ProfileTabNav activeSection="identity" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Identity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contact/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Education/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Experience/i })).toBeInTheDocument();
  });

  it("shows completion badges when sections provided", () => {
    render(
      <ProfileTabNav
        activeSection="tests"
        sections={[
          { section: "identity", filled: 3, total: 5, percent: 60 },
          { section: "tests", filled: 2, total: 4, percent: 50 },
        ]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getByText("2/4")).toBeInTheDocument();
  });

  it("calls onChange when a pill is clicked", () => {
    const onChange = vi.fn();
    render(<ProfileTabNav activeSection="identity" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Education/i }));
    expect(onChange).toHaveBeenCalledWith("education" satisfies ProfileSectionId);
  });
});
