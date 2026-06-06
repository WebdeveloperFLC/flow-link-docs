import { assert, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { clientRequestsCounselor, counselingBeforeAssignEnabled } from "./counselingHandoff.ts";

Deno.test("clientRequestsCounselor: explicit keywords", () => {
  assert(clientRequestsCounselor("COUNSELOR"));
  assert(clientRequestsCounselor("counselor"));
  assert(clientRequestsCounselor("counsellor"));
  assert(clientRequestsCounselor("human"));
});

Deno.test("clientRequestsCounselor: natural language", () => {
  assert(clientRequestsCounselor("I want to talk to a counselor"));
  assert(clientRequestsCounselor("connect me with a human please"));
  assert(clientRequestsCounselor("counsellor se baat karni hai"));
  assert(clientRequestsCounselor("can I speak to someone from your team"));
});

Deno.test("clientRequestsCounselor: rejects unrelated questions", () => {
  assertFalse(clientRequestsCounselor("What documents do I need?"));
  assertFalse(clientRequestsCounselor("How much are the fees?"));
  assertFalse(clientRequestsCounselor("Hi"));
  assertFalse(clientRequestsCounselor(""));
});

Deno.test("counselingBeforeAssignEnabled: explicit true/false override", () => {
  Deno.env.set("WHATSAPP_COUNSELING_BEFORE_ASSIGN", "true");
  assert(counselingBeforeAssignEnabled("rules"));
  Deno.env.set("WHATSAPP_COUNSELING_BEFORE_ASSIGN", "false");
  assertFalse(counselingBeforeAssignEnabled("gemini"));
  Deno.env.delete("WHATSAPP_COUNSELING_BEFORE_ASSIGN");
});

Deno.test("counselingBeforeAssignEnabled: defaults by AI mode", () => {
  Deno.env.delete("WHATSAPP_COUNSELING_BEFORE_ASSIGN");
  assert(counselingBeforeAssignEnabled("gemini"));
  assert(counselingBeforeAssignEnabled("gemini_dev"));
  assert(counselingBeforeAssignEnabled("production"));
  assertFalse(counselingBeforeAssignEnabled("rules"));
  assertFalse(counselingBeforeAssignEnabled("off"));
});