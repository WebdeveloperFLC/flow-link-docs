import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTheme, toggleTheme } from "../../stores/themeStore";

export default function DarkModeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => { setMode(getTheme()); }, []);
  return (
    <Button variant="outline" size="icon" aria-label="Toggle dark mode" onClick={() => setMode(toggleTheme())}>
      {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}