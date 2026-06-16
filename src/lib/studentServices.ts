import type { ServiceSelection } from "@/components/leads/ServiceTabs";

const STUDENT_PATTERN = /\b(student|study permit|study visa|subclass 500|f-1|tier 4)\b/i;

/** True when a service code or catalogue name indicates a student-related service. */
export function isStudentServiceCode(code: string, serviceName?: string | null): boolean {
  const hay = `${code} ${serviceName ?? ""}`;
  return STUDENT_PATTERN.test(hay);
}

export function selectionHasStudentServices(
  selection: Partial<ServiceSelection>,
  labelByCode?: Map<string, string>,
): boolean {
  const codes = [
    ...(selection.visa_services ?? []),
    ...(selection.admission_services ?? []),
    ...(selection.coaching_services ?? []),
  ];
  return codes.some((code) => isStudentServiceCode(code, labelByCode?.get(code)));
}
