import type { AppRole } from "@/contexts/AuthContext";

/** Staff roles that may open counselor training (/service-library). */
export const SERVICE_LIBRARY_VIEW_ROLES: AppRole[] = [
  "admin",
  "administrator",
  "counselor",
  "documentation",
  "telecaller",
];

/** Staff roles that may edit academy content (/service-library-admin). */
export const SERVICE_LIBRARY_ADMIN_ROLES: AppRole[] = [
  "admin",
  "administrator",
  "documentation",
];
