import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import { listCountries, type Country } from "@/lib/settleAbroad";
import { Loader2, Sparkles } from "lucide-react";

export default function AssessmentCountry() {
  const nav = useNavigate();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCountries().then((c) => { setCountries(c); setLoading(false); });
  }, []);

  const choose = (c: Country) => {
    if (c.status !== "active") return;
    sessionStorage.setItem("flc_country", c.code);
    sessionStorage.setItem("flc_country_name", c.name);
    nav("/assessment/goal");
  };

  return (
    <div className="flc-shell min-h-screen">
      <AssessmentHeader
        mode="client"
        right={<button onClick={() => nav("/assessment")} className="text-sm text-[hsl(220_14%_28%)] hover:text-[hsl(220_18%_11%)]">Start over</button>}
      />

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-4 space-y-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">Step 1 of 4</div>
          <h1 className="flc-display text-5xl mt-2">Where do you want to settle?</h1>
          <p className="text-[hsl(220_14%_28%)] mt-3 max-w-2xl">
            Each country has its own pathways and rules. Pick a destination — we'll build the right questionnaire for it.
          </p>
        </div>

        {loading ? (
          <Loader2 className="animate-spin text-[hsl(220_18%_11%)]" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {countries.map((c) => {
              const live = c.status === "active";
              return (
                <button
                  key={c.code}
                  onClick={() => choose(c)}
                  disabled={!live}
                  className={`flc-card p-6 text-left space-y-4 transition relative ${
                    live ? "hover:border-[hsl(220_18%_11%)] hover:-translate-y-0.5 cursor-pointer" : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  {!live && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider bg-[hsl(36_20%_94%)] text-[hsl(220_14%_28%)] px-2 py-0.5 rounded-full">
                      Coming soon
                    </span>
                  )}
                  <div className="text-5xl">{c.flag_emoji ?? "🌍"}</div>
                  <div>
                    <div className="font-semibold text-[hsl(220_18%_11%)] text-lg">{c.name}</div>
                    {live && (
                      <div className="text-xs text-[hsl(8_75%_60%)] font-semibold mt-1 inline-flex items-center gap-1">
                        <Sparkles className="size-3" /> Live pathways available
                      </div>
                    )}
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
