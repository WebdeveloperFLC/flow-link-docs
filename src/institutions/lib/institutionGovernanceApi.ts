import { supabase } from "@/integrations/supabase/client";
import type { InstitutionStatus } from "../types/upi";

export interface GovernanceCheckItem {
  code: string;
  message: string;
}

export interface ActivationValidation {
  errors: GovernanceCheckItem[];
  warnings: GovernanceCheckItem[];
}

export interface SetStatusResult {
  ok: boolean;
  needs_confirmation?: boolean;
  institution_status?: InstitutionStatus;
  is_active?: boolean;
  errors: GovernanceCheckItem[];
  warnings: GovernanceCheckItem[];
}

function parseChecklist(raw: unknown): GovernanceCheckItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item && typeof item === "object" && "message" in item) {
      const row = item as { code?: string; message?: string };
      return { code: row.code ?? "unknown", message: row.message ?? "" };
    }
    return { code: "unknown", message: String(item) };
  });
}

export async function validateInstitutionActivation(
  institutionId: string,
): Promise<ActivationValidation> {
  const { data, error } = await supabase.rpc("fn_validate_upi_institution_activation", {
    _institution_id: institutionId,
  });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as { errors?: unknown; warnings?: unknown };
  return {
    errors: parseChecklist(row.errors),
    warnings: parseChecklist(row.warnings),
  };
}

export async function setInstitutionStatus(
  institutionId: string,
  status: InstitutionStatus,
  forceWarnings = false,
): Promise<SetStatusResult> {
  const { data, error } = await supabase.rpc("fn_upi_institution_set_status", {
    p_institution_id: institutionId,
    p_status: status,
    p_force_warnings: forceWarnings,
  });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    needs_confirmation: Boolean(row.needs_confirmation),
    institution_status: row.institution_status as InstitutionStatus | undefined,
    is_active: row.is_active as boolean | undefined,
    errors: parseChecklist(row.errors),
    warnings: parseChecklist(row.warnings),
  };
}
