import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Gift, LayoutGrid, Wallet } from "lucide-react";

const LINKS = [
  { to: "/performance", label: "Home", icon: LayoutGrid, end: true },
  { to: "/performance/wallets", label: "Wallets", icon: Wallet },
  { to: "/performance/give-discount", label: "Discount", icon: Gift, primary: true },
] as const;

export function PerformanceMobileQuickBar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      data-testid="performance-mobile-quick-bar"
      aria-label="Performance Hub quick actions"
    >
      <div className="mx-auto flex max-w-[390px] items-stretch justify-around gap-1 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active =
            link.to === "/performance"
              ? pathname === "/performance"
              : pathname === link.to || pathname.startsWith(`${link.to}/`);
          return (
            <Button
              key={link.to}
              asChild
              variant={link.primary ? "default" : "ghost"}
              size="sm"
              className={cn(
                "flex-1 flex-col h-auto py-2 gap-1 text-[10px]",
                !link.primary && active && "bg-muted",
              )}
            >
              <Link to={link.to}>
                <Icon className="size-4" />
                {link.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
