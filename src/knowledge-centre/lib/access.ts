import type { AppRole } from "@/contexts/AuthContext";

/** Staff roles with KC view via legacy service-library staff list. */
export const KC_STAFF_VIEW_ROLES: AppRole[] = [
  "admin",
  "administrator",
  "counselor",
  "documentation",
  "telecaller",
  "manager",
  "viewer",
];
