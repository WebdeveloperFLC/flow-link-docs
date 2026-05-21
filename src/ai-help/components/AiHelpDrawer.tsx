import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AiHelpChat } from "./AiHelpChat";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AiHelpDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              aria-label="Ask CRM Coach"
            >
              <Sparkles className="size-5" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Ask CRM Coach</TooltipContent>
      </Tooltip>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col">
        <AiHelpChat className="flex-1 min-h-0" />
      </SheetContent>
    </Sheet>
  );
}