/**
 * Fee Master P3 feature gate (Sprint 1 — ws-1).
 * When false (default), the library is importable but consumers must not enforce the contract.
 */

/**
 * Returns true when `VITE_FEE_MASTER_V1_ENABLED=true` in the Vite environment.
 * Defaults to false when unset — safe for production until a later PR wires consumers.
 */
export function isFeeMasterV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FEE_MASTER_V1_ENABLED;
  return String(raw ?? "false").toLowerCase() === "true";
}
