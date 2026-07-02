/**
 * HR-14 — payroll transition confirmation helpers.
 *
 * Pure logic for the "type the cycle name to confirm" challenge guarding
 * irreversible payroll transitions (Lock, Mark paid). Kept separate from the
 * component so the guard can be unit-tested.
 */

/**
 * Whether a payroll transition may proceed.
 * - Non-irreversible steps (Process, Approve) never require typing.
 * - Irreversible steps require the typed text to match the cycle label
 *   (trimmed, case-sensitive) so an accidental Enter cannot lock/pay a cycle.
 */
export function canProceedWithConfirm(
  requireTyped: boolean,
  typed: string,
  cycleLabel: string,
): boolean {
  if (!requireTyped) return true;
  const expected = cycleLabel.trim();
  if (expected.length === 0) return false;
  return typed.trim() === expected;
}
