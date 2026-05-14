import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function AccountingEmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] text-center">
      <Icon className="w-10 h-10 text-muted-foreground/40 mb-4" />
      <div className="text-[15px] font-medium text-foreground mb-1">{title}</div>
      <p className="text-[13px] text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}