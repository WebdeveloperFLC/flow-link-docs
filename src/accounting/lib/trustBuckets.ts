/** Trust (pass-through) liability buckets — role keys + display labels. */
export const TRUST_BUCKETS: Array<{ roleKey: string; label: string }> = [
  { roleKey: "TRUST_TUITION", label: "Tuition held" },
  { roleKey: "TRUST_EMBASSY", label: "Embassy / visa fees" },
  { roleKey: "TRUST_APPLICATION", label: "Application fees" },
  { roleKey: "TRUST_GIC", label: "GIC held" },
  { roleKey: "TRUST_BIOMETRICS", label: "Biometrics" },
  { roleKey: "TRUST_MEDICAL", label: "Medical / police" },
  { roleKey: "TRUST_OTHER", label: "Other held funds" },
];

export const TRUST_BUCKET_LABEL: Record<string, string> = Object.fromEntries(
  TRUST_BUCKETS.map((b) => [b.roleKey, b.label]),
);

export function trustBucketLabel(roleKey: string): string {
  return TRUST_BUCKET_LABEL[roleKey] ?? roleKey;
}
