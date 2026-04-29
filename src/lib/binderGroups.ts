export interface BinderGroup {
  key: string;
  label: string;
  types: string[];
}

export const BINDER_GROUPS: BinderGroup[] = [
  { key: "identity", label: "Identity & Personal", types: ["Passport", "Birth Certificate", "Photograph"] },
  { key: "academic", label: "Academic", types: ["Academic Transcripts", "Offer Letter", "IELTS / Language Test"] },
  { key: "financial", label: "Financial", types: ["GIC Certificate", "Tuition Fee Receipt", "Financial Documents"] },
  { key: "forms", label: "Visa Forms & Statements", types: ["Visa Forms", "SOP", "Resume"] },
  { key: "supporting", label: "Supporting", types: ["Medical Report", "Other"] },
];

export function groupForType(typeName: string): BinderGroup {
  const found = BINDER_GROUPS.find((g) => g.types.includes(typeName));
  return found ?? BINDER_GROUPS[BINDER_GROUPS.length - 1];
}