import { describe, expect, it } from "vitest";
import {
  formatProfileSaveError,
  isDocumentRefsUnavailableError,
} from "@/lib/profile/profileSaveError";
import { experienceRecordsToJson } from "@/lib/profile/normalizeProfile";
import type { ProfileExperienceRecord } from "@/lib/profile/types";

describe("profileSaveError", () => {
  it("formats PostgREST error with code and message", () => {
    const msg = formatProfileSaveError(
      { message: "relation does not exist", code: "42P01", details: "client_document_refs" },
      "clients",
    );
    expect(msg).toContain("clients:");
    expect(msg).toContain("relation does not exist");
    expect(msg).toContain("42P01");
  });

  it("detects missing client_document_refs table", () => {
    expect(
      isDocumentRefsUnavailableError({
        code: "42P01",
        message: 'relation "public.client_document_refs" does not exist',
      }),
    ).toBe(true);
    expect(
      isDocumentRefsUnavailableError({
        code: "PGRST205",
        message: "Could not find the table public.client_document_refs in the schema cache",
      }),
    ).toBe(true);
  });
});

import { yearOfPassingForDb } from "@/lib/leadBackground";

describe("education year_of_passing serialization", () => {
  it("converts bare year to date for clients.year_of_passing column", () => {
    expect(yearOfPassingForDb("2030")).toBe("2030-06-30");
    expect(yearOfPassingForDb("2024")).toBe("2024-06-30");
  });
});

describe("experienceRecordsToJson", () => {
  it("maps unified experience fields to legacy-compatible JSON", () => {
    const records: ProfileExperienceRecord[] = [
      {
        id: "exp_abc123",
        company: "TCS",
        country: "India",
        state_province: "Delhi",
        city: "New Delhi",
        designation: "Analyst",
        department: "IT",
        employment_type: "Full-time",
        start_date: "2021-01-01",
        end_date: null,
        currently_working: true,
        notes: "Client-facing role",
        linked_documents: [],
      },
    ];

    const json = experienceRecordsToJson(records);
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({
      id: "exp_abc123",
      company: "TCS",
      role: "Analyst",
      designation: "Analyst",
      department: "IT",
      employment_type: "Full-time",
      start_date: "2021-01-01",
      currently_working: true,
      description: "Client-facing role",
      country: "India",
      city: "New Delhi",
    });
    expect(json[0].linked_documents).toEqual([]);
  });

  it("allows empty optional fields (no required DB columns in JSON)", () => {
    const json = experienceRecordsToJson([
      {
        id: "exp_new1",
        company: "afsdsf",
        country: null,
        state_province: null,
        city: null,
        designation: null,
        department: "sfsd",
        employment_type: "sfsd",
        start_date: null,
        end_date: null,
        currently_working: false,
        notes: null,
        linked_documents: [],
      },
    ]);
    expect(json[0].company).toBe("afsdsf");
    expect(json[0].department).toBe("sfsd");
    expect(json[0].start_date).toBeUndefined();
  });
});
