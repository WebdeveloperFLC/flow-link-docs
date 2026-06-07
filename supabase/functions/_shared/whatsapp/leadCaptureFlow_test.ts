import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  nextLeadCaptureReply,
  initialFlMenuIntake,
  shouldForceLeadCaptureConfirm,
  buildLeadCaptureNotes,
  leadCaptureRestart,
} from "./leadCaptureFlow.ts";

Deno.test("welcome -> shows menu", () => {
  const r = nextLeadCaptureReply(initialFlMenuIntake(), "Hi");
  assertEquals(r.intake.step, "service_menu");
  assert(r.replies[0].includes("Future Link Consultants"));
  assert(r.replies[0].includes("Student Visa"));
});

Deno.test("welcome + service 1 in one message -> full_name step", () => {
  const r = nextLeadCaptureReply(initialFlMenuIntake(), "1");
  assertEquals(r.intake.step, "full_name");
  assertEquals(r.intake.service, "student_visa");
  assert(r.replies.some((m) => m.includes("Full Name")));
});

Deno.test("student visa full flow to confirm", () => {
  let intake = initialFlMenuIntake();
  let r = nextLeadCaptureReply(intake, "1");
  intake = r.intake;
  r = nextLeadCaptureReply(intake, "Jane Doe");
  intake = r.intake;
  assertEquals(intake.step, "student_country");
  r = nextLeadCaptureReply(intake, "Canada");
  intake = r.intake;
  assertEquals(intake.step, "student_qualification");
  r = nextLeadCaptureReply(intake, "Bachelors");
  intake = r.intake;
  assertEquals(intake.step, "student_intake");
  r = nextLeadCaptureReply(intake, "Jan 2027");
  intake = r.intake;
  assertEquals(intake.step, "student_branch");
  r = nextLeadCaptureReply(intake, "Vadodara");
  intake = r.intake;
  assertEquals(intake.step, "confirm");
  assertEquals(intake.highest_qualification, "Bachelors");
  assertEquals(intake.preferred_intake, "Jan 2027");
  assertEquals(intake.branch_preference, "Vadodara");
  assert(intake.full_name?.includes("Jane"));
  assertEquals(intake.country, "Canada");
  assert(r.replies[0].includes("Qualification"));
  assert(r.replies[0].includes("Preferred Intake"));
  assert(r.replies[0].includes("Vadodara"));
});

Deno.test("confirm YES completes intake", () => {
  const r = nextLeadCaptureReply(
    {
      flow: "fl_menu_v1",
      step: "confirm",
      full_name: "Jane Doe",
      service: "student_visa",
      service_label: "Student Visa",
      country: "Canada",
      branch_preference: "Ahmedabad",
    },
    "1",
  );
  assertEquals(r.confirmed, true);
  assertEquals(r.intake.step, "done");
  assert(r.replies[0].includes("submitted successfully"));
});

Deno.test("confirm RESTART resets to menu", () => {
  const r = nextLeadCaptureReply(
    {
      flow: "fl_menu_v1",
      step: "confirm",
      full_name: "Jane Doe",
      service_label: "Student Visa",
    },
    "3",
  );
  assertEquals(r.intake.step, "service_menu");
  assert(r.replies.some((m) => m.includes("Please select a service")));
});

Deno.test("edit combined 3 - Canada", () => {
  const r = nextLeadCaptureReply(
    {
      flow: "fl_menu_v1",
      step: "edit_pick",
      full_name: "Jane Doe",
      service_label: "Student Visa",
      country: "UK",
      branch_preference: "Mumbai",
    },
    "3 - Canada",
  );
  assertEquals(r.intake.country, "Canada");
  assertEquals(r.intake.step, "confirm");
});

Deno.test("coaching course 1 -> details", () => {
  let intake = {
    flow: "fl_menu_v1" as const,
    step: "coaching_course" as const,
    full_name: "Test User",
    service: "coaching",
    service_label: "Coaching",
  };
  const r = nextLeadCaptureReply(intake, "1");
  assertEquals(r.intake.coaching_course, "IELTS");
  assertEquals(r.intake.step, "coaching_mode");
});

Deno.test("buildLeadCaptureNotes includes service fields", () => {
  const notes = buildLeadCaptureNotes({
    service_label: "Student Visa",
    country: "Canada",
    branch_preference: "Ahmedabad",
    highest_qualification: "Bachelors",
  });
  assert(notes.includes("Student Visa"));
  assert(notes.includes("Canada"));
});

Deno.test("shouldForceLeadCaptureConfirm on YES", () => {
  assert(shouldForceLeadCaptureConfirm({ step: "confirm" }, "YES"));
  assert(shouldForceLeadCaptureConfirm({ step: "confirm" }, "1"));
});

Deno.test("leadCaptureRestart", () => {
  const r = leadCaptureRestart({ flow: "fl_menu_v1", step: "confirm" });
  assertEquals(r.intake.step, "service_menu");
});
