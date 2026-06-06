import { assertEquals, assert, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizePhoneE164, phonesMatch, phoneSuffix } from "./phone.ts";

Deno.test("normalizePhoneE164: 10-digit India", () => {
  assertEquals(normalizePhoneE164("9876543210"), "919876543210");
});

Deno.test("normalizePhoneE164: strips +91 prefix formatting", () => {
  assertEquals(normalizePhoneE164("+91 98765 43210"), "919876543210");
  assertEquals(normalizePhoneE164("+91-9876543210"), "919876543210");
});

Deno.test("normalizePhoneE164: leading 0", () => {
  assertEquals(normalizePhoneE164("09876543210"), "919876543210");
});

Deno.test("normalizePhoneE164: empty", () => {
  assertEquals(normalizePhoneE164(""), "");
});

Deno.test("phonesMatch: across formats", () => {
  assert(phonesMatch("9876543210", "+919876543210"));
  assert(phonesMatch("+91 98765 43210", "919876543210"));
  assertFalse(phonesMatch("9876543210", "9876543211"));
  assertFalse(phonesMatch("", "9876543210"));
});

Deno.test("phoneSuffix returns last N digits", () => {
  assertEquals(phoneSuffix("919876543210"), "9876543210");
  assertEquals(phoneSuffix("12345"), "12345");
});