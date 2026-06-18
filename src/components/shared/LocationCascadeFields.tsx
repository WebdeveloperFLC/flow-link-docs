import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { normalizeCountryLabel } from "@/lib/geoLocations";
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
  displayLabel,
  placeholder,
  options,
  disabled,
  allowCustom,
  onChange,
}: {
  value: string;
  displayLabel?: string;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  allowCustom?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const selected = options.find(
    (o) =>
      o.value === value ||
      o.label === value ||
      o.label.toLowerCase() === value.toLowerCase() ||
      (displayLabel && o.label.toLowerCase() === displayLabel.toLowerCase()),
  );
  const display =
    selected?.label ||
    displayLabel?.trim() ||
    (value && !options.some((o) => o.value === value) ? value : "");
  const showCustom =
    allowCustom &&
    trimmedSearch.length > 0 &&
    !options.some((o) => o.label.toLowerCase() === trimmedSearch.toLowerCase());

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selectCustom = () => {
    onChange(trimmedSearch);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal h-9", !display && "text-muted-foreground")}
        >
          <span className="truncate">{display || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] z-[200] pointer-events-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}…`}
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCustom) {
                e.preventDefault();
                selectCustom();
              }
            }}
          />
          <CommandList
            className="max-h-[min(280px,50vh)] overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>
              {showCustom ? (
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-accent text-left"
                  onClick={selectCustom}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Use &ldquo;{trimmedSearch}&rdquo;
                </button>
              ) : (
                "No match found."
              )}
            </CommandEmpty>
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
                      value === o.value || displayLabel === o.label ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
              {showCustom && (
                <CommandItem value={`__custom__${trimmedSearch}`} onSelect={selectCustom}>
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  Use &ldquo;{trimmedSearch}&rdquo;
                </CommandItem>
              )}
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
  const country = normalizeCountryLabel(value.country ?? "");
  const {
    ready,
    countries,
    provincesForCountry,
    citiesForProvince,
    resolveProvince,
    hasProvincesForCountry,
  } = useLocationCascadeData(country);

  const province = resolveProvince(country, value.state_province, value.province_code);
  const provinceCode = province?.code ?? "";
  const hasProvinces = !!country && hasProvincesForCountry(country);
  const stateOptions = useMemo(
    () =>
      provincesForCountry(country).map((s) => ({
        value: s.code,
        label: s.label,
      })),
    [country, provincesForCountry],
  );
  const cityOptions = useMemo(
    () => (provinceCode ? citiesForProvince(country, provinceCode) : []),
    [country, provinceCode, citiesForProvince],
  );
  const savedCity = value.city?.trim() ?? "";
  const cityDisabled = hasProvinces && !provinceCode;
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
          displayLabel={value.country ?? ""}
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
        {!country ? (
          <Input disabled placeholder="Select country first" />
        ) : hasProvinces ? (
          <SearchablePicker
            value={provinceCode}
            displayLabel={province?.label ?? value.state_province ?? ""}
            placeholder="Select state / province"
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
            placeholder="Enter state / province"
            onChange={(e) => onChange({ state_province: e.target.value, province_code: "" })}
            onBlur={commit}
          />
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{cityLabel}</Label>
        {!country ? (
          <Input disabled placeholder="Select country first" />
        ) : (
          <SearchablePicker
            value={savedCity}
            displayLabel={resolveCityLabel(value.city, cityOptions)}
            placeholder="Select or type city"
            disabled={cityDisabled}
            allowCustom
            options={cityOptions}
            onChange={(v) => {
              onChange({ city: v });
              setTimeout(commit, 0);
            }}
          />
        )}
      </div>
    </>
  );
}
