import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import { Leaf, Info, ArrowRight, AlertCircle, Gift } from "lucide-react";
import { toast } from "sonner";

const PROMO_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export default function AssessmentLanding() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);

  // A promo code arrives via the URL (?code=FREE2026). The 3-day clock is
  // PER-CANDIDATE — we stamp "first opened" in this browser the first time
  // they land here with that code, and reuse it on return visits.
  const urlCode = (searchParams.get("code") ?? "").trim().toUpperCase();
  const [promoFirstOpened, setPromoFirstOpened] = useState<string | null>(null);

  useEffect(() => {
    if (!urlCode) return;
    setCode(urlCode);
    const key = `flc_promo_opened_${urlCode}`;
    let opened = localStorage.getItem(key);
    if (!opened) {
      opened = new Date().toISOString();
      localStorage.setItem(key, opened);
    }
    setPromoFirstOpened(opened);
    sessionStorage.setItem("flc_promo_code", urlCode);
    sessionStorage.setItem("flc_promo_first_opened", opened);
  }, [urlCode]);

  const promoExpiry = useMemo(() => {
    if (!promoFirstOpened) return null;
    return new Date(new Date(promoFirstOpened).getTime() + PROMO_MS);
  }, [promoFirstOpened]);

  const promoExpired = promoExpiry ? new Date() > promoExpiry : false;
  const daysLeft = promoExpiry
    ? Math.max(0, Math.ceil((promoExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  const start = () => {
    if (!consent) {
      toast.error("Please confirm you understand the advisory notice.");
      return;
    }
    if (code.trim()) sessionStorage.setItem("flc_referral_code", code.trim());
    nav("/assessment/country");
  };

  return (
    <div className="flc-shell min-h-screen">
      <AssessmentHeader mode="client" />

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-4 grid lg:grid-cols-[1.2fr_1fr] gap-10">
        <section className="space-y-6">
          <div className="flc-chip">
            <Leaf className="size-3.5" /> Settle Abroad · Client self-assessment
          </div>

          {urlCode && (
            <div
              className={`flc-card p-4 flex gap-3 max-w-xl ${
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
                    <span className="font-semibold">Your free-assessment window has passed.</span> You can still
                    complete the assessment below — our team will follow up with you.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">🎁 Free assessment unlocked with code {urlCode}.</span> Complete it
                    within {daysLeft} day{daysLeft === 1 ? "" : "s"}
                    {promoExpiry ? ` (by ${promoExpiry.toLocaleDateString()})` : ""} before it expires.
                  </>
                )}
              </div>
            </div>
          )}

          <h1 className="flc-display text-6xl sm:text-7xl">Find your most likely path abroad.</h1>

          <p className="text-[hsl(220_14%_28%)] text-base leading-relaxed max-w-xl">
            A guided eligibility assessment across multiple destinations — currently Canada and Germany, with the UK,
            Australia, USA, New Zealand, UAE and Europe rolling out next.
          </p>

          <div className="space-y-4 max-w-xl pt-2">
            <Row
              icon={Leaf}
              title="Country-first"
              body="Pick a destination, then we tailor the pathways: Express Entry, PNP, Opportunity Card, Blue Card and more."
            />
            <Row
              icon={Info}
              title="Advisory only"
              body="We never replace official government tools or a counselor's review."
            />
          </div>

          <div className="flc-card p-5 flex gap-3 max-w-xl bg-[hsl(8_75%_60%/0.06)] border-[hsl(8_75%_60%/0.25)]">
            <AlertCircle className="size-4 mt-0.5 text-[hsl(8_75%_50%)] shrink-0" />
            <div className="text-sm text-[hsl(220_18%_11%)]">
              <span className="font-semibold">Advisory only.</span> This assessment is not a final immigration decision
              and does not constitute legal advice. Results help your counselor identify the most likely pathways for
              your profile.
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm cursor-pointer max-w-xl pt-1">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="size-4 rounded accent-[hsl(8_75%_60%)]"
            />
            <span className="text-[hsl(220_18%_11%)]">
              I understand this assessment is advisory and not a final immigration decision.
            </span>
          </label>

          <button onClick={start} disabled={!consent} className="flc-cta">
            Start assessment <ArrowRight className="size-4" />
          </button>
        </section>

        <aside className="flc-card p-6 h-fit space-y-5 lg:sticky lg:top-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">
              Promo / Referral code
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="flc-input flex-1"
                placeholder="e.g. FLC2026"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                onClick={() => code.trim() && toast.success(`Referral code "${code.trim()}" applied`)}
                className="px-4 rounded-xl border border-[hsl(30_12%_88%)] bg-white hover:bg-[hsl(36_20%_94%)] text-sm font-medium"
              >
                Apply
              </button>
            </div>
            <div className="text-xs text-[hsl(220_14%_28%)] mt-2">
              Codes can unlock fee discounts and counselor priority.
            </div>
          </div>

          <div className="flc-divider" />

          <div className="grid grid-cols-3 gap-3">
            <Stat value="2" label="Live countries" />
            <Stat value="11" label="Pathways" />
            <Stat value="<5 min" label="To finish" />
          </div>

          <div className="flc-divider" />

          <ul className="space-y-2 text-sm">
            <Bullet>Country-specific branching questions</Bullet>
            <Bullet>Live scoring (CRS for Canada, Chancenkarte for Germany)</Bullet>
            <Bullet>Risk flagging for refusals &amp; admissibility</Bullet>
            <Bullet>Downloadable advisory PDF report</Bullet>
          </ul>
        </aside>
      </main>
    </div>
  );
}

function Row({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="size-9 rounded-lg bg-[hsl(36_20%_94%)] flex items-center justify-center shrink-0">
        <Icon className="size-4 text-[hsl(220_18%_11%)]" />
      </div>
      <div>
        <div className="font-semibold text-[hsl(220_18%_11%)] text-sm">{title}</div>
        <div className="text-sm text-[hsl(220_14%_28%)]" dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    </div>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="flc-display text-3xl">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)] mt-0.5">
        {label}
      </div>
    </div>
  );
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 items-start">
      <span className="size-1.5 rounded-full bg-[hsl(8_75%_60%)] mt-2 shrink-0" />
      <span className="text-[hsl(220_18%_11%)]">{children}</span>
    </li>
  );
}
