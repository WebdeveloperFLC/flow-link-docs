export const SECURITY_CHEQUE_STATUSES = ["Submitted", "Pending", "Not Submitted"] as const;

export type SecurityChequeStatus = (typeof SECURITY_CHEQUE_STATUSES)[number];

const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ACCEPTED_EXT = /\.(jpe?g|png|pdf)$/i;

export function isValidSecurityChequeStatus(v: string): v is SecurityChequeStatus {
  return (SECURITY_CHEQUE_STATUSES as readonly string[]).includes(v);
}

export function isValidSecurityChequeFile(file: File): boolean {
  const mimeOk = !file.type || ACCEPTED_MIME.has(file.type);
  const extOk = ACCEPTED_EXT.test(file.name);
  return mimeOk && extOk;
}

export function formatSecurityChequeUploadedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatSecurityChequeAuditValue(
  fileName: string,
  uploadedByLabel: string,
  uploadedAt: string,
): string {
  return `${fileName} · by ${uploadedByLabel} · ${formatSecurityChequeUploadedAt(uploadedAt)}`;
}
