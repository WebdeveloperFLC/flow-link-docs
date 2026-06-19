import type { ProfileViewModelMeta } from "@/lib/profile/types";

interface Props {
  meta: ProfileViewModelMeta;
  className?: string;
}

export function ProfileMetaBar({ meta, className }: Props) {
  const items: string[] = [];
  if (meta.registration_number) items.push(meta.registration_number);
  if (meta.branch) items.push(meta.branch);
  if (meta.assigned_counselor_name) items.push(`Counselor: ${meta.assigned_counselor_name}`);
  if (meta.client_status_label) items.push(meta.client_status_label);
  if (meta.lead_source) items.push(`Source: ${meta.lead_source}`);

  if (items.length === 0) return null;

  return (
    <p className={`text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 ${className ?? ""}`}>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </p>
  );
}
