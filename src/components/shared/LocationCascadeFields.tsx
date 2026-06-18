import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLocationCascadeData, type LocationFieldsValue } from "@/lib/geoLocations";

interface Props {
  value: LocationFieldsValue;
  onChange: (patch: Partial<LocationFieldsValue>) => void;
  onCommit?: () => void;
  countryLabel?: string;
  stateLabel?: string;
  cityLabel?: string;
}

function SearchablePicker({
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value || o.label === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("w-full justify-between font-normal h-9", !selected && "text-muted-foreground")}
        >
          <span className="truncate">{selected?.label ?? value ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[320px]" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No match found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", (value === o.value || value === o.label) ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function LocationCascadeFields({
  value,
  onChange,
  onCommit,
  countryLabel = "Country",
  stateLabel = "State / Province",
  cityLabel = "City",
}: Props) {
  const country = value.country ?? "";
  const {
    ready,
    priorityCountries,
    provincesForCountry,
    citiesForProvince,
    resolveProvince,
    hasProvincesForCountry,
    buildProvinceCode,
  } = useLocationCascadeData(country);

  const province = resolveProvince(country, value.state_province, value.province_code);
  const provinceCode = province ? buildProvinceCode(country, province.isoCode) : value.province_code ?? "";
  const hasProvinces = !!country && hasProvincesForCountry(country);
  const cities = useMemo(
    () => (provinceCode ? citiesForProvince(country, provinceCode) : []),
    [country, provinceCode, citiesForProvince],
  );
  const stateOptions = useMemo(
    () =>
      provincesForCountry(country).map((s) => ({
        value: buildProvinceCode(country, s.isoCode),
        label: s.name,
      })),
    [country, provincesForCountry, buildProvinceCode],
  );
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.name, label: c.name })),
    [cities],
  );
  const commit = () => onCommit?.();

  if (!ready) {
    return (
      <div className="md:col-span-3 text-xs text-muted-foreground py-2">
        Loading location lists…
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">{countryLabel}</Label>
        <SearchablePicker
          value={country}
          placeholder="Select country"
          options={[
            ...priorityCountries.priority.map((c) => ({ value: c.name, label: c.name })),
            ...priorityCountries.rest.map((c) => ({ value: c.name, label: c.name })),
          ]}
          onChange={(v) => {
            onChange({ country: v, state_province: "", province_code: "", city: "" });
            setTimeout(commit, 0);
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{stateLabel}</Label>
        {hasProvinces ? (
          stateOptions.length > 12 ? (
            <SearchablePicker
              value={provinceCode || value.state_province || ""}
              placeholder="Select state / province"
              disabled={!country}
              options={stateOptions}
              onChange={(code) => {
                const s = provincesForCountry(country).find(
                  (x) => buildProvinceCode(country, x.isoCode) === code,
                );
                onChange({
                  province_code: code,
                  state_province: s?.name ?? code,
                  city: "",
                });
                setTimeout(commit, 0);
              }}
            />
          ) : (
            <Select
              value={provinceCode || value.state_province || ""}
              onValueChange={(code) => {
                const s = provincesForCountry(country).find(
                  (x) => buildProvinceCode(country, x.isoCode) === code,
                );
                onChange({
                  province_code: code,
                  state_province: s?.name ?? code,
                  city: "",
                });
                setTimeout(commit, 0);
              }}
              disabled={!country}
            >
              <SelectTrigger><SelectValue placeholder="Select state / province" /></SelectTrigger>
              <SelectContent>
                {stateOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
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
          <SearchablePicker
            value={value.city ?? ""}
            placeholder="Select city"
            disabled={!provinceCode}
            options={cityOptions}
            onChange={(v) => {
              onChange({ city: v });
              setTimeout(commit, 0);
            }}
          />
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
