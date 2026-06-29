import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

export function KcEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center space-y-3">
      <BookOpen className="size-10 mx-auto text-muted-foreground" />
      <div className="text-lg font-semibold">{title}</div>
      {description && <p className="text-sm text-muted-foreground max-w-lg mx-auto">{description}</p>}
      {action}
    </Card>
  );
}
