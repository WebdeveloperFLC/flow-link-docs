import { describe, expect, it } from "vitest";
import { findDuplicateInstitution, institutionDedupKey } from "./institutionDedup";

describe("institutionDedup", () => {
  const insts = [
    { id: "1", name: "Arden University - Berlin", country_name: "Germany" },
    { id: "2", name: "Algoma University", country_name: "Canada" },
  ];

  it("treats same name and country as duplicate", () => {
    expect(findDuplicateInstitution(insts, "Arden University - Berlin", "Germany")?.id).toBe("1");
    expect(findDuplicateInstitution(insts, "arden university berlin", "germany")?.id).toBe("1");
    expect(findDuplicateInstitution(insts, "Algoma University", "United States")).toBeNull();
  });

  it("builds stable dedup keys", () => {
    expect(institutionDedupKey("Arden University - Berlin", "Germany")).toBe(
      institutionDedupKey("arden university berlin", "germany"),
    );
  });

  it("allows same brand name in different countries", () => {
    const berlin = institutionDedupKey("Arden University - Berlin", "Germany");
    const london = institutionDedupKey("Arden University", "United Kingdom");
    expect(berlin).not.toBe(london);
    expect(findDuplicateInstitution(insts, "Arden University", "United Kingdom")).toBeNull();
  });
});
