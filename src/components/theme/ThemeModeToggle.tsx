import { resolveThemeModeDark } from "@/lib/themeStore";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ThemeModeToggleProps {
  /** Hub topbar styling (dark chip on navy bar). */
  variant?: "default" | "hub";
}

export function ThemeModeToggle({ variant = "default" }: ThemeModeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = resolveThemeModeDark(theme.mode);
  const isHub = variant === "hub";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={isHub ? "sm" : "icon"}
          className={cn(
            isHub
              ? "h-8 px-2.5 rounded-md text-xs font-semibold text-white hover:bg-white/10 hover:text-white gap-1.5"
              : "size-8 rounded-full",
          )}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme({ mode: isDark ? "light" : "dark" })}
        >
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {isHub ? (isDark ? "Light" : "Dark") : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{isDark ? "Light mode" : "Dark mode"}</TooltipContent>
    </Tooltip>
  );
}
