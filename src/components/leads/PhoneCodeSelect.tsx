import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// (name, ISO alpha-2, dial code without +)
const RAW: [string, string, string][] = [
  ["Afghanistan","AF","93"],["Albania","AL","355"],["Algeria","DZ","213"],["Andorra","AD","376"],["Angola","AO","244"],["Argentina","AR","54"],["Armenia","AM","374"],["Australia","AU","61"],["Austria","AT","43"],["Azerbaijan","AZ","994"],["Bahamas","BS","1242"],["Bahrain","BH","973"],["Bangladesh","BD","880"],["Barbados","BB","1246"],["Belarus","BY","375"],["Belgium","BE","32"],["Belize","BZ","501"],["Benin","BJ","229"],["Bhutan","BT","975"],["Bolivia","BO","591"],["Bosnia and Herzegovina","BA","387"],["Botswana","BW","267"],["Brazil","BR","55"],["Brunei","BN","673"],["Bulgaria","BG","359"],["Burkina Faso","BF","226"],["Burundi","BI","257"],["Cambodia","KH","855"],["Cameroon","CM","237"],["Canada","CA","1"],["Cape Verde","CV","238"],["Central African Republic","CF","236"],["Chad","TD","235"],["Chile","CL","56"],["China","CN","86"],["Colombia","CO","57"],["Comoros","KM","269"],["Congo","CG","242"],["Congo (DRC)","CD","243"],["Costa Rica","CR","506"],["Croatia","HR","385"],["Cuba","CU","53"],["Cyprus","CY","357"],["Czech Republic","CZ","420"],["Denmark","DK","45"],["Djibouti","DJ","253"],["Dominican Republic","DO","1809"],["Ecuador","EC","593"],["Egypt","EG","20"],["El Salvador","SV","503"],["Estonia","EE","372"],["Eswatini","SZ","268"],["Ethiopia","ET","251"],["Fiji","FJ","679"],["Finland","FI","358"],["France","FR","33"],["Gabon","GA","241"],["Gambia","GM","220"],["Georgia","GE","995"],["Germany","DE","49"],["Ghana","GH","233"],["Greece","GR","30"],["Grenada","GD","1473"],["Guatemala","GT","502"],["Guinea","GN","224"],["Guyana","GY","592"],["Haiti","HT","509"],["Honduras","HN","504"],["Hong Kong","HK","852"],["Hungary","HU","36"],["Iceland","IS","354"],["India","IN","91"],["Indonesia","ID","62"],["Iran","IR","98"],["Iraq","IQ","964"],["Ireland","IE","353"],["Israel","IL","972"],["Italy","IT","39"],["Ivory Coast","CI","225"],["Jamaica","JM","1876"],["Japan","JP","81"],["Jordan","JO","962"],["Kazakhstan","KZ","7"],["Kenya","KE","254"],["Kosovo","XK","383"],["Kuwait","KW","965"],["Kyrgyzstan","KG","996"],["Laos","LA","856"],["Latvia","LV","371"],["Lebanon","LB","961"],["Lesotho","LS","266"],["Liberia","LR","231"],["Libya","LY","218"],["Liechtenstein","LI","423"],["Lithuania","LT","370"],["Luxembourg","LU","352"],["Macau","MO","853"],["Madagascar","MG","261"],["Malawi","MW","265"],["Malaysia","MY","60"],["Maldives","MV","960"],["Mali","ML","223"],["Malta","MT","356"],["Mauritania","MR","222"],["Mauritius","MU","230"],["Mexico","MX","52"],["Moldova","MD","373"],["Monaco","MC","377"],["Mongolia","MN","976"],["Montenegro","ME","382"],["Morocco","MA","212"],["Mozambique","MZ","258"],["Myanmar","MM","95"],["Namibia","NA","264"],["Nepal","NP","977"],["Netherlands","NL","31"],["New Zealand","NZ","64"],["Nicaragua","NI","505"],["Niger","NE","227"],["Nigeria","NG","234"],["North Korea","KP","850"],["North Macedonia","MK","389"],["Norway","NO","47"],["Oman","OM","968"],["Pakistan","PK","92"],["Palestine","PS","970"],["Panama","PA","507"],["Papua New Guinea","PG","675"],["Paraguay","PY","595"],["Peru","PE","51"],["Philippines","PH","63"],["Poland","PL","48"],["Portugal","PT","351"],["Qatar","QA","974"],["Romania","RO","40"],["Russia","RU","7"],["Rwanda","RW","250"],["Saudi Arabia","SA","966"],["Senegal","SN","221"],["Serbia","RS","381"],["Singapore","SG","65"],["Slovakia","SK","421"],["Slovenia","SI","386"],["Somalia","SO","252"],["South Africa","ZA","27"],["South Korea","KR","82"],["South Sudan","SS","211"],["Spain","ES","34"],["Sri Lanka","LK","94"],["Sudan","SD","249"],["Suriname","SR","597"],["Sweden","SE","46"],["Switzerland","CH","41"],["Syria","SY","963"],["Taiwan","TW","886"],["Tajikistan","TJ","992"],["Tanzania","TZ","255"],["Thailand","TH","66"],["Togo","TG","228"],["Trinidad and Tobago","TT","1868"],["Tunisia","TN","216"],["Turkey","TR","90"],["Turkmenistan","TM","993"],["Uganda","UG","256"],["Ukraine","UA","380"],["United Arab Emirates","AE","971"],["United Kingdom","GB","44"],["United States","US","1"],["Uruguay","UY","598"],["Uzbekistan","UZ","998"],["Venezuela","VE","58"],["Vietnam","VN","84"],["Yemen","YE","967"],["Zambia","ZM","260"],["Zimbabwe","ZW","263"],
];
const flag = (a2: string) => a2.length === 2 ? String.fromCodePoint(...[...a2.toUpperCase()].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65)) : "🌐";
const PINNED = ["India","Canada","United Kingdom","Australia","Germany","United Arab Emirates","United States","New Zealand"];

interface Opt { name: string; a2: string; code: string; }
const ALL: Opt[] = RAW.map(([n,a,c]) => ({ name: n, a2: a, code: c }));
const PINNED_OPTS = PINNED.map((n) => ALL.find((o) => o.name === n)).filter((o): o is Opt => !!o);
const REST_OPTS = ALL.filter((o) => !PINNED.includes(o.name)).sort((a, b) => a.name.localeCompare(b.name));

interface Props {
  value?: string | null; // stored as "+91"
  onChange: (v: string) => void;
  className?: string;
}

export function PhoneCodeSelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const commandRef = useRef<HTMLDivElement>(null);

  const current = useMemo(() => {
    const digits = (value || "").replace(/\D/g, "");
    if (!digits) return null;
    return ALL.find((o) => o.code === digits) || null;
  }, [value]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    requestAnimationFrame(() => {
      const input = commandRef.current?.querySelector<HTMLInputElement>("[cmdk-input]");
      input?.focus();
      if (search) input?.setSelectionRange(search.length, search.length);
    });
  }, [open, search]);

  const openWithSearch = (nextSearch: string) => {
    setSearch(nextSearch);
    setOpen(true);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      openWithSearch(e.key);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal gap-1", className)}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="truncate flex items-center gap-1.5 min-w-0">
            {current ? (
              <>
                <span className="shrink-0">{flag(current.a2)}</span>
                <span className="truncate">{current.name}</span>
                <span className="text-muted-foreground shrink-0">+{current.code}</span>
              </>
            ) : value ? (
              value
            ) : (
              <span className="text-muted-foreground">Country code</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px] max-h-[360px]" align="start">
        <Command
          ref={commandRef}
          value={search}
          onValueChange={setSearch}
          filter={(val, q) => val.toLowerCase().includes(q.toLowerCase()) ? 1 : 0}
        >
          <CommandInput placeholder="Type to search — e.g. India, +91, IN…" autoFocus />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup heading="Suggested">
              {PINNED_OPTS.map((o) => (
                <CommandItem key={o.name} value={`${o.name} ${o.a2} +${o.code}`} onSelect={() => { onChange(`+${o.code}`); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", current?.name === o.name ? "opacity-100" : "opacity-0")} />
                  <span className="mr-2">{flag(o.a2)}</span>
                  <span className="flex-1 truncate">{o.name}</span>
                  <span className="text-muted-foreground">+{o.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="All countries">
              {REST_OPTS.map((o) => (
                <CommandItem key={o.name} value={`${o.name} ${o.a2} +${o.code}`} onSelect={() => { onChange(`+${o.code}`); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", current?.name === o.name ? "opacity-100" : "opacity-0")} />
                  <span className="mr-2">{flag(o.a2)}</span>
                  <span className="flex-1 truncate">{o.name}</span>
                  <span className="text-muted-foreground">+{o.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
