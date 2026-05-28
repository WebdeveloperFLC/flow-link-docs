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
  ArrowLeft,
  MailCheck,
  Gift,
} from "lucide-react";
import { listPathways, countryNameFor, flagFor, dialCodeFor, type Pathway } from "@/lib/settleAbroad";
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

type Step = "pick" | "register" | "done";

export default function AssessmentGoal() {
  const nav = useNavigate();
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("pick");
  const [busy, setBusy] = useState(false);
  const [countryCode] = useState(() => sessionStorage.getItem("flc_country") ?? "CA");
  const countryName = countryNameFor(countryCode);
  const countryFullName = sessionStorage.getItem("flc_country_name") ?? countryName;

  // Chosen pathway
  const [chosen, setChosen] = useState<Pathway | null>(null);

  // Registration form
  const [first, setFirst] = useState("");
  const [middle, setMiddle] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(() => {
    const d = dialCodeFor(sessionStorage.getItem("flc_country") ?? "CA");
    return d ? `${d} ` : "";
  });

  // Promo info read from the landing page
  const promoCode = sessionStorage.getItem("flc_promo_code");
  const promoFirstOpened = sessionStorage.getItem("flc_promo_first_opened");
  const promoExpiry = promoFirstOpened
    ? new Date(new Date(promoFirstOpened).getTime() + 3 * 24 * 60 * 60 * 1000)
    : null;
  const promoExpired = promoExpiry ? new Date() > promoExpiry : false;

  useEffect(() => {
    listPathways(countryCode).then((p) => {
      setPathways(p);
      setLoading(false);
    });
  }, [countryCode]);

  const pick = (p: Pathway) => {
    sessionStorage.setItem("flc_goal", p.pathway_code);
    sessionStorage.setItem("flc_goal_label", p.label);
    setChosen(p);
    setStep("register");
  };

  const register = async () => {
    if (!first.trim() || !last.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in your first name, last name, email and phone.");
      return;
    }
    setBusy(true);
    try {
      const referralCode = sessionStorage.getItem("flc_referral_code") ?? undefined;
      const body: Record<string, unknown> = {
        firstName: first.trim(),
        middleName: middle.trim() || undefined,
        lastName: last.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(referralCode ? { referralCode } : {}),
        ...(promoCode ? { promoCode, promoFirstOpenedAt: promoFirstOpened } : {}),
        // Carry the candidate's country + goal so the session is created correctly
        intendedCountry: countryFullName,
        intendedGoal: chosen?.pathway_code,
      };

      const { data, error } = await supabase.functions.invoke("assessment-register", { body });
      if (error || (data as any)?.error) {
        toast.error(error?.message ?? (data as any)?.error ?? "Could not register. Please try again.");
        return;
      }
      setStep("done");
      toast.success("Check your email — we've sent a verification link.");
    } catch {
      toast.error("Could not register. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flc-shell min-h-screen">
      <AssessmentHeader
        mode="client"
        right={
          step === "register" ? (
            <button
              onClick={() => setStep("pick")}
              className="text-sm text-[hsl(220_14%_28%)] hover:text-[hsl(220_18%_11%)] flex items-center gap-1"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
          ) : (
            <button
              onClick={() => nav("/assessment/country")}
              className="text-sm text-[hsl(220_14%_28%)] hover:text-[hsl(220_18%_11%)]"
            >
              Change country
            </button>
          )
        }
      />

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-4 space-y-8">
        {step === "pick" && (
          <>
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
                      onClick={() => pick(p)}
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
          </>
        )}

        {step === "register" && (
          <div className="max-w-xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none">{flagFor(countryCode)}</span>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">
                  Step 3 of 4
                </div>
                <div className="font-semibold text-[hsl(220_18%_11%)]">{countryFullName}</div>
              </div>
            </div>
            <h1 className="flc-display text-5xl mt-3">Almost there.</h1>
            <p className="text-[hsl(220_14%_28%)] mt-3">
              Tell us who you are so we can save your <span className="font-medium">{chosen?.label}</span> assessment
              and send your results. We'll email you a quick verification link to begin.
            </p>

            {promoCode && (
              <div
                className={`flc-card p-4 flex gap-3 mt-5 ${
                  promoExpired
                    ? "bg-[hsl(220_14%_28%/0.06)] border-[hsl(30_12%_88%)]"
                    : "bg-[hsl(150_60%_45%/0.08)] border-[hsl(150_50%_45%/0.3)]"
                }`}
              >
                <Gift
                  className={`size-5 mt-0.5 shrink-0 ${promoExpired ? "text-[hsl(220_14%_40%)]" : "text-[hsl(150_55%_38%)]"}`}
                />
                <div className="text-sm text-[hsl(220_18%_11%)]">
                  {promoExpired ? (
                    <>
                      Your free-assessment window for code <b>{promoCode}</b> has passed, but you can still complete it
                      — our team will follow up.
                    </>
                  ) : (
                    <>
                      Free assessment with code <b>{promoCode}</b>
                      {promoExpiry ? ` — valid until ${promoExpiry.toLocaleDateString()}` : ""}.
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flc-card p-6 mt-5 space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="First name *" value={first} onChange={setFirst} />
                <Field label="Middle name" value={middle} onChange={setMiddle} />
                <Field label="Last name *" value={last} onChange={setLast} />
              </div>
              <Field label="Email *" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <Field
                label="Phone *"
                value={phone}
                onChange={setPhone}
                placeholder={`${dialCodeFor(countryCode) || "+"} 00000 00000`}
              />

              <button onClick={register} disabled={busy} className="flc-cta w-full justify-center">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Send my verification link <MailCheck className="size-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-[hsl(220_14%_28%)] text-center">
                By continuing you agree this assessment is advisory and not a final immigration decision.
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="max-w-md mx-auto w-full flc-card p-8 text-center space-y-4 mt-8">
            <div className="size-12 rounded-full bg-[hsl(150_60%_45%/0.12)] flex items-center justify-center mx-auto">
              <MailCheck className="size-6 text-[hsl(150_55%_38%)]" />
            </div>
            <h2 className="flc-display text-3xl">Check your email</h2>
            <p className="text-sm text-[hsl(220_14%_28%)]">
              We've sent a verification link to <span className="font-medium text-[hsl(220_18%_11%)]">{email}</span>.
              Click it to start your {chosen?.label} assessment for {countryFullName}.
            </p>
            <p className="text-xs text-[hsl(220_14%_28%)]">
              Didn't get it? Check spam, or contact your Future Link consultant.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[hsl(220_18%_11%)]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flc-input w-full"
      />
    </label>
  );
}
