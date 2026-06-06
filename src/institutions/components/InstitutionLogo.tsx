import { useState } from "react";
import { School } from "lucide-react";

const SIZES = {
  sm: "size-7 text-[10px]",
  md: "size-10 text-xs",
  lg: "size-16 text-sm",
} as const;

export function InstitutionLogo({
  url,
  name,
  size = "md",
  className = "",
}: {
  url?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const box = `${SIZES[size]} rounded-md border bg-background shrink-0 overflow-hidden flex items-center justify-center ${className}`;

  if (url && !broken) {
    return (
      <img
        src={url}
        alt={`${name} logo`}
        className={`${box} object-contain p-0.5`}
        onError={() => setBroken(true)}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className={`${box} bg-muted/60 text-muted-foreground font-semibold`} title={name}>
      {initials.length >= 1 ? initials : <School className="size-1/2 opacity-60" />}
    </div>
  );
}
