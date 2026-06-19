import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileContact, ProfileIdentity } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

type FieldDef = {
  key: keyof ProfileIdentity;
  label: string;
  type?: "date" | "text";
};

const IDENTITY_FIELDS: FieldDef[] = [
  { key: "first_name", label: "First name" },
  { key: "middle_name", label: "Middle name" },
  { key: "last_name", label: "Last name" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "gender", label: "Gender" },
  { key: "nationality", label: "Nationality" },
  { key: "place_of_birth", label: "Place of birth" },
  { key: "marital_status", label: "Marital status" },
  { key: "spouse_name", label: "Spouse name" },
  { key: "passport_number", label: "Passport number" },
  { key: "passport_country", label: "Passport country" },
  { key: "passport_issue_date", label: "Passport issue date", type: "date" },
  { key: "passport_expiry", label: "Passport expiry", type: "date" },
];

interface Props {
  identity: ProfileIdentity;
  mode: "view" | "edit";
  onPatch?: (patch: Partial<ProfileIdentity>) => void;
  className?: string;
}

export function ProfileIdentityPanel({ identity, mode, onPatch, className }: Props) {
  if (mode === "view") {
    const filled = IDENTITY_FIELDS.filter((f) => (identity[f.key] ?? "").toString().trim());
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2", className)}>
        {filled.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-2">No identity details captured yet.</p>
        ) : (
          filled.map((f) => (
            <div key={f.key} className="text-sm">
              <span className="text-muted-foreground">{f.label}: </span>
              <span>{String(identity[f.key])}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}>
      {IDENTITY_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          <Input
            type={f.type ?? "text"}
            value={(identity[f.key] ?? "") as string}
            onChange={(e) => onPatch?.({ [f.key]: e.target.value || null } as Partial<ProfileIdentity>)}
          />
        </div>
      ))}
    </div>
  );
}

type ContactFieldDef = {
  key: keyof ProfileContact;
  label: string;
};

const CONTACT_FIELDS: ContactFieldDef[] = [
  { key: "phone_primary", label: "Primary phone" },
  { key: "phone_alt", label: "Alt phone" },
  { key: "email_primary", label: "Primary email" },
  { key: "email_alt", label: "Alt email" },
  { key: "address_line1", label: "Address" },
  { key: "address_city", label: "City" },
  { key: "address_state", label: "State" },
  { key: "address_country", label: "Country" },
  { key: "address_postal", label: "Postal code" },
  { key: "emergency_contact_name", label: "Emergency contact name" },
  { key: "emergency_contact_phone", label: "Emergency contact phone" },
];

interface ContactProps {
  contact: ProfileContact;
  mode: "view" | "edit";
  onPatch?: (patch: Partial<ProfileContact>) => void;
  className?: string;
}

export function ProfileContactPanel({ contact, mode, onPatch, className }: ContactProps) {
  if (mode === "view") {
    const filled = CONTACT_FIELDS.filter((f) => (contact[f.key] ?? "").toString().trim());
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2", className)}>
        {filled.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-2">No contact details captured yet.</p>
        ) : (
          filled.map((f) => (
            <div key={f.key} className="text-sm">
              <span className="text-muted-foreground">{f.label}: </span>
              <span>{String(contact[f.key])}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}>
      {CONTACT_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          <Input
            value={(contact[f.key] ?? "") as string}
            onChange={(e) => onPatch?.({ [f.key]: e.target.value || null } as Partial<ProfileContact>)}
          />
        </div>
      ))}
    </div>
  );
}
