import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Quick light/dark toggle — Phase 5D Performance Hub polish */
export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme({ mode: isDark ? "light" : "dark" })}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{isDark ? "Light mode" : "Dark mode"}</TooltipContent>
    </Tooltip>
  );
}
