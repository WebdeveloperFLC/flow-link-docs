/** UI label for `clients.application_id` (CRM client file number — not a service case id). */
export const CLIENT_FILE_NUMBER_LABEL = "Client File #";

/** Compact inline label aligned with Reg / Lead patterns in headers and lists. */
export function clientFileInline(applicationId: string | null | undefined): string {
  const id = applicationId?.trim();
  if (!id) return "—";
  return `File ${id}`;
}
