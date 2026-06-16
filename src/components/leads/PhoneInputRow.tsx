import { PhoneCodeSelect } from "@/components/leads/PhoneCodeSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  required?: boolean;
  countryCode?: string | null;
  phone?: string | null;
  onCountryCodeChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onBlur?: () => void;
  className?: string;
};

/** Phone country code (flag + name + dial code) + local number — shared UX across CRM. */
export function PhoneInputRow({
  label = "Phone",
  required,
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  onBlur,
  className,
}: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="flex gap-2">
        <PhoneCodeSelect
          value={countryCode ?? ""}
          onChange={onCountryCodeChange}
          className="w-[min(100%,240px)] shrink-0"
        />
        <Input
          className="flex-1 min-w-0"
          value={phone ?? ""}
          onChange={(e) => onPhoneChange(e.target.value)}
          onBlur={onBlur}
          inputMode="tel"
          placeholder="Phone number"
        />
      </div>
    </div>
  );
}
