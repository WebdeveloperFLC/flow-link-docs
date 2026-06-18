import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelect } from "@/components/leads/CountrySelect";
import { useLocationCascadeData, type LocationFieldsValue } from "@/lib/locationCascade";

interface Props {
  value: LocationFieldsValue;
  onChange: (patch: Partial<LocationFieldsValue>) => void;
  onCommit?: () => void;
  countryLabel?: string;
  stateLabel?: string;
  cityLabel?: string;
}

export function LocationCascadeFields({
  value,
  onChange,
  onCommit,
  countryLabel = "Country",
  stateLabel = "State / Province",
  cityLabel = "City",
}: Props) {
  const { provincesForCountry, citiesForProvince, resolveProvince, hasProvincesForCountry } = useLocationCascadeData();
  const country = value.country ?? "";
  const hasProvinces = !!country && hasProvincesForCountry(country);
  const province = resolveProvince(country, value.state_province, value.province_code);
  const provinceCode = province?.code ?? value.province_code ?? "";
  const cityOptions = provinceCode ? citiesForProvince(provinceCode) : [];
  const commit = () => onCommit?.();

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">{countryLabel}</Label>
        <CountrySelect
          value={country || null}
          onChange={(v) => {
            onChange({ country: v, state_province: "", province_code: "", city: "" });
            setTimeout(commit, 0);
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{stateLabel}</Label>
        {hasProvinces ? (
          <Select
            value={provinceCode || value.state_province || ""}
            onValueChange={(code) => {
              const p = provincesForCountry(country).find((x) => x.code === code);
              onChange({
                province_code: code,
                state_province: p?.label ?? code,
                city: "",
              });
              setTimeout(commit, 0);
            }}
            disabled={!country}
          >
            <SelectTrigger><SelectValue placeholder="Select state / province" /></SelectTrigger>
            <SelectContent>
              {provincesForCountry(country).map((p) => (
                <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value.state_province ?? ""}
            placeholder={country ? "Enter state / province" : "Select country first"}
            disabled={!country}
            onChange={(e) => onChange({ state_province: e.target.value, province_code: "" })}
            onBlur={commit}
          />
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{cityLabel}</Label>
        {hasProvinces && cityOptions.length > 0 ? (
          <Select
            value={value.city ?? ""}
            onValueChange={(v) => {
              onChange({ city: v });
              setTimeout(commit, 0);
            }}
            disabled={!provinceCode}
          >
            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>
              {cityOptions.map((c) => (
                <SelectItem key={c.code} value={c.label}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value.city ?? ""}
            placeholder={country ? "Enter city" : "Select country first"}
            disabled={!country}
            onChange={(e) => onChange({ city: e.target.value })}
            onBlur={commit}
          />
        )}
      </div>
    </>
  );
}
