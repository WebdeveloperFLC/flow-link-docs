import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  hideBack?: boolean;
}

export default function AccountingPageHeader({ title, subtitle, actions, hideBack }: Props) {
  const navigate = useNavigate();
  return (
    <div className="mb-6 space-y-3">
      {!hideBack && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      )}
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}