import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";
import { hrAudit, type HrActorInfo } from "./hrApi";
import type { EmployeeAssetRow, EmployeeRow } from "./types";

export const ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Mobile",
  "Tablet",
  "SIM Card",
  "WiFi Dongle",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Headphone",
  "Charger",
  "Pen Drive",
  "Other",
] as const;

export const ASSET_STATUSES = [
  "Issued",
  "Returned",
  "Damaged",
  "Lost",
  "Replaced",
  "Cancelled",
] as const;

export const ASSET_CONDITIONS = ["Good", "Fair", "Damaged", "Not Working"] as const;

export const ACCESSORY_OPTIONS = [
  "Mouse",
  "Keyboard",
  "Charger",
  "Headphone",
  "Pen Drive",
  "Laptop Bag",
  "SIM Card",
  "WiFi Dongle",
  "Monitor",
  "Other",
] as const;

export const ACTIVE_ASSET_STATUSES = ["Issued", "Damaged", "Lost", "Replaced"] as const;

export type AssetType = (typeof ASSET_TYPES)[number];
export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export type EmployeeAssetDraft = {
  _key: string;
  id?: string;
  asset_type: string;
  asset_type_other: string;
  asset_name: string;
  model_number: string;
  serial_number: string;
  asset_tag: string;
  mac_address: string;
  imei_number: string;
  service_provider: string;
  mobile_number: string;
  sim_number: string;
  remarks: string;
  issue_date: string;
  issued_by_employee_id: string;
  asset_status: AssetStatus;
  return_date: string;
  collected_by_employee_id: string;
  asset_condition: string;
  return_remarks: string;
  accessories: string[];
  accessory_other: string;
};

const MAC_TYPES = new Set(["Laptop", "Desktop"]);
const IMEI_TYPES = new Set(["Mobile", "Tablet"]);

export const ACCESSORY_ASSET_TYPES = new Set([
  "Mouse",
  "Keyboard",
  "Headphone",
  "Charger",
  "Pen Drive",
  "Monitor",
]);

export type AssetFieldKey =
  | "asset_type_other"
  | "asset_name"
  | "model_number"
  | "serial_number"
  | "asset_tag"
  | "mac_address"
  | "imei_number"
  | "service_provider"
  | "mobile_number"
  | "sim_number"
  | "accessories"
  | "remarks";

export type AssetFieldVisibility = Record<AssetFieldKey, boolean>;

export function displayAssetTypeLabel(type: string, typeOther?: string | null): string {
  if (type === "Other" && typeOther?.trim()) return typeOther.trim();
  return type;
}

export function formatAssetIssueDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function assetSummaryIdentifier(a: Pick<EmployeeAssetDraft, "serial_number" | "imei_number" | "asset_tag">): string {
  return a.serial_number || a.imei_number || a.asset_tag || "—";
}

export function assetFieldVisibility(type: string): AssetFieldVisibility {
  const none: AssetFieldVisibility = {
    asset_type_other: false,
    asset_name: false,
    model_number: false,
    serial_number: false,
    asset_tag: false,
    mac_address: false,
    imei_number: false,
    service_provider: false,
    mobile_number: false,
    sim_number: false,
    accessories: false,
    remarks: true,
  };

  if (type === "Laptop" || type === "Desktop") {
    return {
      ...none,
      asset_name: true,
      model_number: true,
      serial_number: true,
      asset_tag: true,
      mac_address: true,
      accessories: true,
    };
  }
  if (type === "Mobile" || type === "Tablet") {
    return {
      ...none,
      asset_name: true,
      model_number: true,
      imei_number: true,
      accessories: true,
    };
  }
  if (type === "SIM Card") {
    return {
      ...none,
      service_provider: true,
      mobile_number: true,
      sim_number: true,
    };
  }
  if (type === "WiFi Dongle") {
    return {
      ...none,
      service_provider: true,
      mobile_number: true,
      model_number: true,
      serial_number: true,
    };
  }
  if (ACCESSORY_ASSET_TYPES.has(type)) {
    return {
      ...none,
      asset_name: true,
      serial_number: true,
    };
  }
  if (type === "Other") {
    return {
      ...none,
      asset_type_other: true,
      asset_name: true,
      model_number: true,
      serial_number: true,
    };
  }
  return { ...none, asset_name: true, model_number: true, serial_number: true };
}

export function firstAssetErrorIndex(errors: Record<string, string>): number | null {
  for (const k of Object.keys(errors)) {
    const m = k.match(/^asset_(\d+)_/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function isActiveAsset(status: string): boolean {
  return (ACTIVE_ASSET_STATUSES as readonly string[]).includes(status);
}

export function assetSupportsMac(type: string): boolean {
  return MAC_TYPES.has(type);
}

export function assetSupportsImei(type: string): boolean {
  return IMEI_TYPES.has(type);
}

export function newAssetDraft(): EmployeeAssetDraft {
  return {
    _key: crypto.randomUUID(),
    asset_type: "Laptop",
    asset_type_other: "",
    asset_name: "",
    model_number: "",
    serial_number: "",
    asset_tag: "",
    mac_address: "",
    imei_number: "",
    service_provider: "",
    mobile_number: "",
    sim_number: "",
    remarks: "",
    issue_date: "",
    issued_by_employee_id: "",
    asset_status: "Issued",
    return_date: "",
    collected_by_employee_id: "",
    asset_condition: "",
    return_remarks: "",
    accessories: [],
    accessory_other: "",
  };
}

export function assetRowToDraft(row: EmployeeAssetRow): EmployeeAssetDraft {
  const accessories = Array.isArray(row.accessories) ? row.accessories : [];
  return {
    _key: row.id,
    id: row.id,
    asset_type: row.asset_type,
    asset_type_other: row.asset_type_other ?? "",
    asset_name: row.asset_name ?? "",
    model_number: row.model_number ?? "",
    serial_number: row.serial_number ?? "",
    asset_tag: row.asset_tag ?? "",
    mac_address: row.mac_address ?? "",
    imei_number: row.imei_number ?? "",
    service_provider: row.service_provider ?? "",
    mobile_number: row.mobile_number ?? "",
    sim_number: row.sim_number ?? "",
    remarks: row.remarks ?? "",
    issue_date: row.issue_date ?? "",
    issued_by_employee_id: row.issued_by_employee_id ?? "",
    asset_status: row.asset_status as AssetStatus,
    return_date: row.return_date ?? "",
    collected_by_employee_id: row.collected_by_employee_id ?? "",
    asset_condition: row.asset_condition ?? "",
    return_remarks: row.return_remarks ?? "",
    accessories: accessories.filter((a): a is string => typeof a === "string"),
    accessory_other: row.accessory_other ?? "",
  };
}

export function employeeLabel(employees: EmployeeRow[], id: string): string {
  const e = employees.find((x) => x.id === id);
  return e ? `${e.full_name} (${e.emp_code})` : "—";
}

export function assetAuditTarget(empCode: string, empName: string, draft: EmployeeAssetDraft): string {
  const tag = draft.serial_number || draft.asset_tag || draft.asset_name || "asset";
  return `${empCode} · ${empName} · ${draft.asset_type} · ${tag}`;
}

export function validateEmployeeAssets(
  assets: EmployeeAssetDraft[],
  employees: EmployeeRow[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  assets.forEach((a, i) => {
    const p = `asset_${i}`;
    if (!a.asset_type.trim()) errors[`${p}_type`] = "Asset Type is required";
    if (a.asset_type === "Other" && !a.asset_type_other.trim()) {
      errors[`${p}_type_other`] = "Specify Asset Type is required";
    }
    if (!a.issue_date) errors[`${p}_issue_date`] = "Issue Date is required";
    if (!a.issued_by_employee_id) errors[`${p}_issued_by`] = "Issued By is required";

    const vis = assetFieldVisibility(a.asset_type);
    if (vis.accessories && a.accessories.includes("Other") && !a.accessory_other.trim()) {
      errors[`${p}_accessory_other`] = "Specify Other Accessory is mandatory";
    }

    if (a.asset_status === "Returned") {
      if (!a.return_date) errors[`${p}_return_date`] = "Return Date is required";
      if (!a.collected_by_employee_id) errors[`${p}_collected_by`] = "Collected By is required";
      if (!a.asset_condition) errors[`${p}_condition`] = "Asset Condition is required";
      if (a.return_date && a.issue_date && a.return_date < a.issue_date) {
        errors[`${p}_return_date`] = "Return Date cannot be earlier than Issue Date";
      }
    }

    if (a.issued_by_employee_id && !employees.some((e) => e.id === a.issued_by_employee_id)) {
      errors[`${p}_issued_by`] = "Invalid Issued By selection";
    }
    if (a.collected_by_employee_id && !employees.some((e) => e.id === a.collected_by_employee_id)) {
      errors[`${p}_collected_by`] = "Invalid Collected By selection";
    }
  });

  return errors;
}

function draftToPayload(draft: EmployeeAssetDraft, employeeId: string, employees: EmployeeRow[]) {
  const issuedLabel = employeeLabel(employees, draft.issued_by_employee_id);
  const collectedLabel = draft.collected_by_employee_id
    ? employeeLabel(employees, draft.collected_by_employee_id)
    : null;

  return {
    org_id: HR_ORG_ID,
    employee_id: employeeId,
    asset_type: draft.asset_type,
    asset_type_other: draft.asset_type === "Other" ? draft.asset_type_other.trim() || null : null,
    asset_name: draft.asset_name.trim() || null,
    model_number: draft.model_number.trim() || null,
    serial_number: draft.serial_number.trim() || null,
    asset_tag: draft.asset_tag.trim() || null,
    mac_address: draft.mac_address.trim() || null,
    imei_number: draft.imei_number.trim() || null,
    service_provider: draft.service_provider.trim() || null,
    mobile_number: draft.mobile_number.trim() || null,
    sim_number: draft.sim_number.trim() || null,
    remarks: draft.remarks.trim() || null,
    issue_date: draft.issue_date,
    issued_by_employee_id: draft.issued_by_employee_id || null,
    issued_by_label: issuedLabel,
    asset_status: draft.asset_status,
    return_date: draft.asset_status === "Returned" ? draft.return_date || null : null,
    collected_by_employee_id:
      draft.asset_status === "Returned" ? draft.collected_by_employee_id || null : null,
    collected_by_label: draft.asset_status === "Returned" ? collectedLabel : null,
    asset_condition: draft.asset_status === "Returned" ? draft.asset_condition || null : null,
    return_remarks:
      draft.asset_status === "Returned" ? draft.return_remarks.trim() || null : null,
    accessories: draft.accessories,
    accessory_other: draft.accessories.includes("Other") ? draft.accessory_other.trim() || null : null,
  };
}

const STATUS_AUDIT: Partial<Record<AssetStatus, string>> = {
  Returned: "Asset Returned",
  Lost: "Asset Marked Lost",
  Damaged: "Asset Marked Damaged",
  Replaced: "Asset Replaced",
  Cancelled: "Asset Cancelled",
};

function rowSnapshot(row: EmployeeAssetRow | ReturnType<typeof draftToPayload>): string {
  return [
    row.asset_type,
    row.asset_name,
    row.serial_number,
    row.asset_status,
    row.issue_date,
    row.return_date,
  ]
    .filter(Boolean)
    .join(" · ");
}

async function auditAssetChanges(
  prev: EmployeeAssetRow | null,
  next: EmployeeAssetRow | ReturnType<typeof draftToPayload>,
  target: string,
  actor: HrActorInfo,
  isNew: boolean,
) {
  if (isNew) {
    await hrAudit("Asset Added", target, "—", rowSnapshot(next), actor);
    return;
  }
  if (!prev) return;

  if (prev.asset_status !== next.asset_status) {
    const action = STATUS_AUDIT[next.asset_status as AssetStatus] ?? "Asset Updated";
    await hrAudit(action, target, prev.asset_status, next.asset_status, actor);
  }
  if (prev.issue_date !== next.issue_date) {
    await hrAudit("Issue Date Changes", target, prev.issue_date ?? "—", next.issue_date ?? "—", actor);
  }
  if ((prev.return_date ?? null) !== (next.return_date ?? null)) {
    await hrAudit(
      "Return Date Changes",
      target,
      prev.return_date ?? "—",
      next.return_date ?? "—",
      actor,
    );
  }
  if (prev.issued_by_label !== next.issued_by_label) {
    await hrAudit(
      "Issued By Changes",
      target,
      prev.issued_by_label ?? "—",
      next.issued_by_label ?? "—",
      actor,
    );
  }
  if ((prev.collected_by_label ?? null) !== (next.collected_by_label ?? null)) {
    await hrAudit(
      "Collected By Changes",
      target,
      prev.collected_by_label ?? "—",
      next.collected_by_label ?? "—",
      actor,
    );
  }

  const prevSnap = rowSnapshot(prev);
  const nextSnap = rowSnapshot(next);
  const otherChanged =
    prev.asset_type !== next.asset_type ||
    prev.asset_name !== next.asset_name ||
    prev.model_number !== next.model_number ||
    prev.serial_number !== next.serial_number ||
    prev.asset_tag !== next.asset_tag ||
    prev.mac_address !== next.mac_address ||
    prev.imei_number !== next.imei_number ||
    prev.service_provider !== next.service_provider ||
    prev.mobile_number !== next.mobile_number ||
    prev.sim_number !== next.sim_number ||
    prev.remarks !== next.remarks ||
    JSON.stringify(prev.accessories) !== JSON.stringify(next.accessories);

  if (otherChanged && prevSnap !== nextSnap && prev.asset_status === next.asset_status) {
    await hrAudit("Asset Updated", target, prevSnap, nextSnap, actor);
  }
}

export async function syncEmployeeAssets(
  employeeId: string,
  drafts: EmployeeAssetDraft[],
  existing: EmployeeAssetRow[],
  employees: EmployeeRow[],
  empCode: string,
  empName: string,
  actor: HrActorInfo,
): Promise<void> {
  const existingById = new Map(existing.map((r) => [r.id, r]));
  const keptIds = new Set<string>();

  for (const draft of drafts) {
    const payload = draftToPayload(draft, employeeId, employees);
    const target = assetAuditTarget(empCode, empName, draft);

    if (draft.id) {
      keptIds.add(draft.id);
      const prev = existingById.get(draft.id);
      const { data, error } = await supabase
        .from("employee_assets" as never)
        .update(payload as never)
        .eq("id", draft.id)
        .select("*")
        .single();
      if (error) throw error;
      await auditAssetChanges(prev ?? null, data as EmployeeAssetRow, target, actor, false);
    } else {
      const { data, error } = await supabase
        .from("employee_assets" as never)
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      await auditAssetChanges(null, data as EmployeeAssetRow, target, actor, true);
    }
  }

  // No hard deletes — existing rows not in drafts are left unchanged (spec: no permanent delete)
  void keptIds;
}
