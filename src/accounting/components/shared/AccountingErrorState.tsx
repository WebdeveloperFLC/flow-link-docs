import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export default function AccountingErrorState({
  title = "Something went wrong",
  description = "We couldn't load this section. Please try again.",
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-6">
      <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <div className="text-[15px] font-medium text-foreground mb-1">{title}</div>
      <p className="text-[13px] text-muted-foreground max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>
      )}
    </div>
  );
}