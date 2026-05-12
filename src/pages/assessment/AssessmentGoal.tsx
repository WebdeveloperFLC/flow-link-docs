import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import {
  Leaf, Briefcase, GraduationCap, Plane, Users, Building2, Compass, Sparkles, Search,
  BadgeCheck, Map as MapIcon, Loader2,
} from "lucide-react";
import { listPathways, countryNameFor, type Pathway } from "@/lib/settleAbroad";

const ICON_MAP: Record<string, React.ElementType> = {
  leaf: Leaf,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  plane: Plane,
  users: Users,
  "building-2": Building2,
  compass: Compass,
  sparkles: Sparkles,
  search: Search,
  "badge-check": BadgeCheck,
  map: MapIcon,
};

export default function AssessmentGoal() {
  const nav = useNavigate();
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryCode] = useState(() => sessionStorage.getItem("flc_country") ?? "CA");
  const countryName = countryNameFor(countryCode);

  useEffect(() => {
    listPathways(countryCode).then((p) => { setPathways(p); setLoading(false); });
  }, [countryCode]);

  const choose = (p: Pathway) => {
    sessionStorage.setItem("flc_goal", p.pathway_code);
    sessionStorage.setItem("flc_goal_label", p.label);
    nav("/assessment/questions");
  };

  return (
    <div className="flc-shell min-h-screen">
      <AssessmentHeader
        mode="client"
        right={<button onClick={() => nav("/assessment/country")} className="text-sm text-[hsl(220_14%_28%)] hover:text-[hsl(220_18%_11%)]">Change country</button>}
      />

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-4 space-y-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">Step 2 of 4 · {countryName}</div>
          <h1 className="flc-display text-5xl mt-2">Which pathway fits you?</h1>
          <p className="text-[hsl(220_14%_28%)] mt-3">Pick your primary goal in {countryName}. You can run more than one later.</p>
        </div>

        {loading ? (
          <Loader2 className="animate-spin text-[hsl(220_18%_11%)]" />
        ) : pathways.length === 0 ? (
          <div className="flc-card p-8 text-center text-sm text-[hsl(220_14%_28%)]">
            No pathways are configured for {countryName} yet. Please choose another country.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pathways.map((p) => {
              const Icon = ICON_MAP[p.icon ?? ""] ?? Compass;
              return (
                <button
                  key={p.id}
                  onClick={() => choose(p)}
                  className="flc-card p-5 text-left space-y-5 hover:border-[hsl(220_18%_11%)] hover:-translate-y-0.5 transition"
                >
                  <div className="size-10 rounded-xl bg-[hsl(36_20%_94%)] flex items-center justify-center">
                    <Icon className="size-5 text-[hsl(220_18%_11%)]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[hsl(220_18%_11%)]">{p.label}</div>
                    {p.description && <div className="text-sm text-[hsl(220_14%_28%)] mt-1">{p.description}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
