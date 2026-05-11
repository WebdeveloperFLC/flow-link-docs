import { Leaf, User, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AssessmentHeader({ mode = "client", right }: { mode?: "client" | "counselor"; right?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="max-w-6xl mx-auto px-4 pt-6 pb-4 flex items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-[hsl(220_18%_11%)] text-white flex items-center justify-center">
          <Leaf className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-[hsl(220_18%_11%)]">Future Link Consultants</div>
          <div className="text-xs text-[hsl(220_14%_28%)]">Canada Immigration Assessment</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {right}
        <div className="flc-pill">
          <button data-active={mode === "client"} onClick={() => nav("/assessment")}>
            <User className="size-3.5" /> Client
          </button>
          <button data-active={mode === "counselor"} onClick={() => nav("/assessment-admin")}>
            <Headphones className="size-3.5" /> Counselor
          </button>
        </div>
      </div>
    </header>
  );
}