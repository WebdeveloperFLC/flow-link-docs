import { describe, it, expect } from "vitest";
import { isFeeMasterV1Enabled } from "./featureFlag";

describe("feeMaster featureFlag", () => {
  it("defaults to false when env unset", () => {
    expect(isFeeMasterV1Enabled()).toBe(false);
  });
});
