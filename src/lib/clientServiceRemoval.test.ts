import { describe, expect, it } from "vitest";
import { diffRemovedServiceCodes } from "./clientServiceRemoval";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";

describe("clientServiceRemoval", () => {
  it("diffRemovedServiceCodes finds removed visa service", () => {
    const before: ServiceSelection = {
      visa_services: ["abc::Canada", "def::Australia"],
      coaching_services: [],
      admission_services: [],
      allied_services: [],
      travel_services: [],
    };
    const after: ServiceSelection = {
      ...before,
      visa_services: ["def::Australia"],
    };
    const removed = diffRemovedServiceCodes(before, after, []);
    expect(removed).toContain("abc::Canada");
    expect(removed).not.toContain("def::Australia");
  });
});
