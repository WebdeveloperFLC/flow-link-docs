import { useNavigate } from "react-router-dom";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import { Leaf, Briefcase, GraduationCap, Plane, Users, Building2, Compass } from "lucide-react";

const GOALS = [
  { id: "permanent_residence", icon: Leaf, title: "Permanent Residence", body: "Express Entry, PNP, Quebec, pilots" },
  { id: "work_permit", icon: Briefcase, title: "Work Permit", body: "Open, employer-specific, LMIA, pilots" },
  { id: "study_permit", icon: GraduationCap, title: "Study Permit", body: "College, university, SDS pathway" },
  { id: "visitor_visa", icon: Plane, title: "Visitor Visa", body: "Tourist, family visit, Super Visa" },
  { id: "family_sponsorship", icon: Users, title: "Family Sponsorship", body: "Spouse, child, parent, relative" },
  { id: "business_investment", icon: Building2, title: "Business / Investment", body: "Start-up Visa, entrepreneur, investor" },
  { id: "unsure", icon: Compass, title: "Unsure / Need Guidance", body: "Run a broad eligibility check" },
];

export default function AssessmentGoal() {
  const nav = useNavigate();

  const choose = (id: string) => {
    sessionStorage.setItem("flc_goal", id);
    nav("/assessment/questions");
  };

  return (
    <div className="flc-shell min-h-screen">
      <AssessmentHeader
        mode="client"
        right={<button onClick={() => nav("/assessment")} className="text-sm text-[hsl(220_14%_28%)] hover:text-[hsl(220_18%_11%)]">Start over</button>}
      />

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-4 space-y-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">Step 1 of 3</div>
          <h1 className="flc-display text-5xl mt-2">What&apos;s your primary goal?</h1>
          <p className="text-[hsl(220_14%_28%)] mt-3">Choose the path that fits best. You can always run another assessment later.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => choose(g.id)}
              className="flc-card p-5 text-left space-y-6 hover:border-[hsl(220_18%_11%)] hover:-translate-y-0.5 transition"
            >
              <div className="size-10 rounded-xl bg-[hsl(36_20%_94%)] flex items-center justify-center">
                <g.icon className="size-5 text-[hsl(220_18%_11%)]" />
              </div>
              <div>
                <div className="font-semibold text-[hsl(220_18%_11%)]">{g.title}</div>
                <div className="text-sm text-[hsl(220_14%_28%)] mt-1">{g.body}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}