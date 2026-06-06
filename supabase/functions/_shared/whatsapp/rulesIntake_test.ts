import { assertEquals, assert, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  nextRulesReply,
  splitName,
  isIntakeYesConfirm,
  shouldForceIntakeConfirm,
  normalizeIntakeFields,
  intakeReadyToConfirm,
} from "./rulesIntake.ts";

Deno.test("welcome -> extracts country from 'I want to study in Canada'", () => {
  const r = nextRulesReply({ step: "welcome" }, "I want to study in Canada");
  assertEquals(r.intake.country, "Canada");
  assertEquals(r.intake.step, "level");
  assert(r.replies[0].includes("Canada"));
});

Deno.test("country step -> accepts short answer 'UK'", () => {
  const r = nextRulesReply({ step: "country" }, "UK");
  assertEquals(r.intake.country, "Uk");
  assertEquals(r.intake.step, "level");
});

Deno.test("level step -> parses 'PG' as postgraduate", () => {
  const r = nextRulesReply({ step: "level", country: "Canada" }, "PG");
  assertEquals(r.intake.level, "postgraduate");
  assertEquals(r.intake.step, "branch");
});

Deno.test("level step -> parses 'undergraduate'", () => {
  const r = nextRulesReply({ step: "level", country: "Canada" }, "undergraduate");
  assertEquals(r.intake.level, "undergraduate");
});

Deno.test("level step -> parses 'work'", () => {
  const r = nextRulesReply({ step: "level", country: "Canada" }, "work");
  assertEquals(r.intake.level, "work visa");
});

Deno.test("branch step -> captures preference", () => {
  const r = nextRulesReply(
    { step: "branch", country: "Canada", level: "postgraduate" },
    "Mumbai",
  );
  assertEquals(r.intake.branch_preference, "Mumbai");
  assertEquals(r.intake.step, "name");
});

Deno.test("name step -> rejects greeting", () => {
  const r = nextRulesReply(
    { step: "name", country: "Canada", level: "postgraduate", branch_preference: "Any" },
    "hi there",
  );
  assertEquals(r.intake.step, "name");
  assert(r.replies[0].toLowerCase().includes("full name"));
});

Deno.test("name step -> accepts 'Santosh Ramrakhiani'", () => {
  const r = nextRulesReply(
    { step: "name", country: "Canada", level: "postgraduate", branch_preference: "Any" },
    "Santosh Ramrakhiani",
  );
  assertEquals(r.intake.full_name, "Santosh Ramrakhiani");
  assertEquals(r.intake.step, "confirm");
});

Deno.test("confirm step -> YES completes intake", () => {
  const r = nextRulesReply(
    {
      step: "confirm",
      country: "Canada",
      level: "postgraduate",
      branch_preference: "Mumbai",
      full_name: "Test User",
    },
    "YES",
  );
  assertEquals(r.confirmed, true);
  assertEquals(r.intake.step, "done");
});

Deno.test("isIntakeYesConfirm matches variants", () => {
  assert(isIntakeYesConfirm("YES"));
  assert(isIntakeYesConfirm("yes"));
  assert(isIntakeYesConfirm("Y"));
  assert(isIntakeYesConfirm("confirm"));
  assertFalse(isIntakeYesConfirm("yeah maybe"));
  assertFalse(isIntakeYesConfirm("no"));
});

Deno.test("shouldForceIntakeConfirm true when ready + YES", () => {
  assert(shouldForceIntakeConfirm(
    { step: "confirm", country: "Canada", level: "postgraduate", full_name: "T U" },
    "YES",
  ));
  assertFalse(shouldForceIntakeConfirm({ step: "country" }, "YES"));
  assertFalse(shouldForceIntakeConfirm(
    { step: "confirm", country: "Canada", level: "postgraduate", full_name: "T U" },
    "no",
  ));
});

Deno.test("splitName edge cases", () => {
  assertEquals(splitName("Santosh Ramrakhiani"), { first_name: "Santosh", last_name: "Ramrakhiani" });
  assertEquals(splitName("Madonna"), { first_name: "Madonna", last_name: "Lead" });
  assertEquals(splitName(""), { first_name: "WhatsApp", last_name: "Lead" });
  assertEquals(splitName("A B C D"), { first_name: "A", last_name: "B C D" });
});

Deno.test("RESTART (in unknown step) resets via main code; rules treats RESTART at unknown step", () => {
  const r = nextRulesReply({ step: "done" }, "RESTART");
  assertEquals(r.intake.step, "country");
});

Deno.test("normalizeIntakeFields maps legacy keys", () => {
  const n = normalizeIntakeFields({ step: "confirm", name: "X Y", branch: "Pune" } as any);
  assertEquals(n.full_name, "X Y");
  assertEquals(n.branch_preference, "Pune");
});

Deno.test("intakeReadyToConfirm needs core fields", () => {
  assert(intakeReadyToConfirm({ step: "confirm" } as any));
  assert(intakeReadyToConfirm({ country: "Canada", level: "pg", full_name: "X Y" }));
  assertFalse(intakeReadyToConfirm({ country: "Canada" }));
});