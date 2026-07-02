import { describe, expect, it } from "vitest";
import { formatClientDuplicateMessage, type ClientDuplicateMatch } from "./clientDuplicate";

describe("formatClientDuplicateMessage", () => {
  const base: ClientDuplicateMatch = {
    id: "abc-123",
    full_name: "Jane Doe",
    registration_number: "REG-001",
    application_id: "APP-001",
    email: "jane@example.com",
    phone: "9876543210",
    matchFields: ["email"],
  };

  it("describes email match", () => {
    expect(formatClientDuplicateMessage(base)).toContain("Jane Doe");
    expect(formatClientDuplicateMessage(base)).toContain("email");
  });

  it("describes phone match", () => {
    expect(
      formatClientDuplicateMessage({ ...base, matchFields: ["phone"] }),
    ).toContain("phone");
  });

  it("describes both fields", () => {
    expect(
      formatClientDuplicateMessage({ ...base, matchFields: ["email", "phone"] }),
    ).toContain("email and phone");
  });
});
