import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  resolveCityLabel,
  useLocationCascadeData,
  type LocationFieldsValue,
} from "@/lib/locationCascade";

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
  const [search, setSearch] = useState("");
  const selected = options.find(
    (o) => o.value === value || o.label === value || o.label.toLowerCase() === value.toLowerCase(),
  );
  const display = selected?.label ?? (value && !options.some((o) => o.value === value) ? value : "");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal h-9", !selected && !value && "text-muted-foreground")}
        >
          <span className="truncate">{display || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] z-[200]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}…`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[min(280px,50vh)]">
            <CommandEmpty>No match found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  keywords={[o.value, o.label]}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === o.value || value === o.label ? "opacity-100" : "opacity-0",
                    )}
                  />
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
    countries,
    provincesForCountry,
    citiesForProvince,
    resolveProvince,
    hasProvincesForCountry,
  } = useLocationCascadeData(country);

  const province = resolveProvince(country, value.state_province, value.province_code);
  const provinceCode = province?.code ?? value.province_code ?? "";
  const hasProvinces = !!country && hasProvincesForCountry(country);
  const cities = useMemo(
    () => (provinceCode ? citiesForProvince(country, provinceCode) : []),
    [country, provinceCode, citiesForProvince],
  );
  const stateOptions = useMemo(
    () =>
      provincesForCountry(country).map((s) => ({
        value: s.code,
        label: s.label,
      })),
    [country, provincesForCountry],
  );
  const cityOptions = useMemo(() => cities, [cities]);
  const savedCity = value.city?.trim() ?? "";
  const cityInOptions = useMemo(
    () =>
      cityOptions.some(
        (c) =>
          c.label.toLowerCase() === savedCity.toLowerCase() ||
          c.value.toLowerCase() === savedCity.toLowerCase(),
      ),
    [cityOptions, savedCity],
  );
  const useCityPicker = cityOptions.length > 0 && (!savedCity || cityInOptions);
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
            ...countries.priority.map((c) => ({ value: c, label: c })),
            ...countries.rest.map((c) => ({ value: c, label: c })),
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
          <SearchablePicker
            value={provinceCode || value.state_province || ""}
            placeholder="Select state / province"
            disabled={!country}
            options={stateOptions}
            onChange={(code) => {
              const s = provincesForCountry(country).find((x) => x.code === code);
              onChange({
                province_code: code,
                state_province: s?.label ?? code,
                city: "",
              });
              setTimeout(commit, 0);
            }}
          />
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
        {useCityPicker ? (
          <SearchablePicker
            value={resolveCityLabel(value.city, cityOptions)}
            placeholder="Select city"
            disabled={!provinceCode && hasProvinces}
            options={cityOptions}
            onChange={(v) => {
              onChange({ city: v });
              setTimeout(commit, 0);
            }}
          />
        ) : (
          <Input
            value={value.city ?? ""}
            placeholder={
              country
                ? hasProvinces && provinceCode
                  ? "Enter city (not in list)"
                  : "Enter city"
                : "Select country first"
            }
            disabled={!country}
            onChange={(e) => onChange({ city: e.target.value })}
            onBlur={commit}
          />
        )}
      </div>
    </>
  );
}
