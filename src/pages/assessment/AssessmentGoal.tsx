import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import {
  Leaf,
  Briefcase,
  GraduationCap,
  Plane,
  Users,
  Building2,
  Compass,
  Sparkles,
  Search,
  BadgeCheck,
  Map as MapIcon,
  Loader2,
} from "lucide-react";
import { listPathways, countryNameFor, type Pathway } from "@/lib/settleAbroad";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [creating, setCreating] = useState(false);
  const [countryCode] = useState(() => sessionStorage.getItem("flc_country") ?? "CA");
  const countryName = countryNameFor(countryCode);
  const countryFullName = sessionStorage.getItem("flc_country_name") ?? countryName;

  useEffect(() => {
    listPathways(countryCode).then((p) => {
      setPathways(p);
      setLoading(false);
    });
  }, [countryCode]);

  const choose = async (p: Pathway) => {
    sessionStorage.setItem("flc_goal", p.pathway_code);
    sessionStorage.setItem("flc_goal_label", p.label);

    setCreating(true);
    try {
      const referralCode = sessionStorage.getItem("flc_referral_code") ?? undefined;

      const body: Record<string, unknown> = {
        goal: p.pathway_code,
        country: countryFullName,
        newClient: {
          full_name: "Assessment Lead",
          country: countryFullName,
          application_type: `${countryFullName} — self-assessment`,
        },
        ...(referralCode ? { referralCode } : {}),
      };

      const { data, error } = await supabase.functions.invoke("assessment-session-create", { body });

      if (error || (data as any)?.error) {
        sessionStorage.setItem("flc_pending_goal", p.pathway_code);
        sessionStorage.setItem("flc_pending_country", countryFullName);
        toast.info("Please log in or use your invitation link to continue.");
        nav("/auth");
        return;
      }

      sessionStorage.removeItem("flc_referral_code");

      const sessionId = (data as any).sessionId as string;
      nav(`/assessment/run/${sessionId}`);
    } catch {
      toast.error("Could not start the assessment. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flc-shell min-h-screen">
      <AssessmentHeader
        mode="client"
        right={
          <button
            onClick={() => nav("/assessment/country")}
            className="text-sm text-[hsl(220_14%_28%)] hover:text-[hsl(220_18%_11%)]"
          >
            Change country
          </button>
        }
      />

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-4 space-y-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">
            Step 2 of 4 · {countryFullName}
          </div>
          <h1 className="flc-display text-5xl mt-2">Which pathway fits you?</h1>
          <p className="text-[hsl(220_14%_28%)] mt-3">
            Pick your primary goal in {countryFullName}. You can run more than one later.
          </p>
        </div>

        {loading ? (
          <Loader2 className="animate-spin text-[hsl(220_18%_11%)]" />
        ) : pathways.length === 0 ? (
          <div className="flc-card p-8 text-center text-sm text-[hsl(220_14%_28%)]">
            No pathways are configured for {countryFullName} yet. Please choose another country.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pathways.map((p) => {
              const Icon = ICON_MAP[p.icon ?? ""] ?? Compass;
              return (
                <button
                  key={p.id}
                  onClick={() => choose(p)}
                  disabled={creating}
                  className="flc-card p-5 text-left space-y-5 hover:border-[hsl(220_18%_11%)] hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="size-10 rounded-xl bg-[hsl(36_20%_94%)] flex items-center justify-center">
                    {creating ? (
                      <Loader2 className="size-5 animate-spin text-[hsl(220_18%_11%)]" />
                    ) : (
                      <Icon className="size-5 text-[hsl(220_18%_11%)]" />
                    )}
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
