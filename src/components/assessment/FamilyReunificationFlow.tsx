import { useMemo } from "react";
import {
  evaluateFamily,
  type FamilyAnswers,
  type FamilyBranch,
  FAMILY_BRANCH_LABELS,
} from "@/lib/assessment/family";

// IRCC LICO 2024 — mirrors the PDF table so counselors see funds requirement live.
const LICO_ROWS: { size: number; label: string; amount: number }[] = [
  { size: 1, label: "1 person",   amount: 27514 },
  { size: 2, label: "2 persons",  amount: 34254 },
  { size: 3, label: "3 persons",  amount: 42100 },
  { size: 4, label: "4 persons",  amount: 51128 },
  { size: 5, label: "5 persons",  amount: 57988 },
  { size: 6, label: "6 persons",  amount: 65400 },
  { size: 7, label: "7 persons",  amount: 72814 },
];
const LICO_EXTRA = 7412;

function LicoTable({ familySize, isSuperVisa }: { familySize?: number; isSuperVisa?: boolean }) {
  const required = (() => {
    if (!familySize || familySize < 1) return null;
    const row = LICO_ROWS.find((r) => r.size === familySize);
    if (row) return row.amount;
    return LICO_ROWS[LICO_ROWS.length - 1].amount + (familySize - 7) * LICO_EXTRA;
  })();
  return (
    <div className="rounded-xl border border-[hsl(30_12%_82%)] bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-[hsl(30_12%_88%)] bg-[hsl(36_20%_96%)]">
        <div className="text-sm font-semibold text-[hsl(220_18%_11%)]">Income requirement — IRCC LICO (2024)</div>
        <div className="text-xs text-[hsl(220_14%_45%)] mt-0.5">
          {isSuperVisa
            ? "Super Visa: sponsor must meet LICO; no 3-year MNI requirement."
            : "Family Class / PGP: sponsor must meet Minimum Necessary Income (LICO + 30% for PGP) for 3 consecutive tax years."}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[hsl(220_14%_45%)]">
            <th className="px-4 py-2 font-semibold">Family unit size</th>
            <th className="px-4 py-2 font-semibold text-right">Minimum income (CAD / yr)</th>
          </tr>
        </thead>
        <tbody>
          {LICO_ROWS.map((r) => {
            const hi = familySize === r.size;
            return (
              <tr key={r.size} className={hi ? "bg-amber-50" : ""}>
                <td className={`px-4 py-1.5 ${hi ? "font-semibold" : ""}`}>{r.label}</td>
                <td className={`px-4 py-1.5 text-right ${hi ? "font-semibold" : ""}`}>CAD {r.amount.toLocaleString()}</td>
              </tr>
            );
          })}
          <tr className="text-[hsl(220_14%_45%)]">
            <td className="px-4 py-1.5">Each additional person</td>
            <td className="px-4 py-1.5 text-right">+ CAD {LICO_EXTRA.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      {required != null && (
        <div className="px-4 py-2.5 border-t border-[hsl(30_12%_88%)] bg-[hsl(36_20%_98%)] text-sm">
          <span className="text-[hsl(220_14%_45%)]">Declared family size {familySize}:</span>{" "}
          <span className="font-semibold text-[hsl(220_18%_11%)]">CAD {required.toLocaleString()}</span> required.
        </div>
      )}
      <div className="px-4 py-1.5 text-[10px] text-[hsl(220_14%_55%)]">Source: IRCC — figures advisory; confirm latest at canada.ca.</div>
    </div>
  );
}

interface Props {
  value: FamilyAnswers;
  onChange: (next: FamilyAnswers) => void;
}

const BRANCHES: { id: FamilyBranch; label: string; hint: string }[] = [
  { id: "spouse", label: "Spouse / Common-law / Conjugal", hint: "Sponsor your partner to Canada" },
  { id: "child", label: "Dependent child", hint: "Biological, adopted, or stepchild" },
  { id: "parent", label: "Parent / Grandparent", hint: "Super Visa or PGP sponsorship" },
  { id: "other", label: "Other family member", hint: "Sibling, cousin, niece/nephew — exceptional cases only" },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[hsl(220_18%_11%)]">{label}</label>
      {hint && <div className="text-xs text-[hsl(220_14%_45%)]">{hint}</div>}
      {children}
    </div>
  );
}

function RadioRow<T extends string>({
  options, value, onChange, name,
}: { options: { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              active
                ? "bg-[hsl(220_18%_11%)] text-white border-[hsl(220_18%_11%)]"
                : "bg-white text-[hsl(220_18%_11%)] border-[hsl(30_12%_82%)] hover:border-[hsl(220_18%_11%)]"
            }`}
            data-name={name}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <RadioRow
      name="yn"
      value={value === true ? "yes" : value === false ? "no" : undefined}
      onChange={(v) => onChange(v === "yes")}
      options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
    />
  );
}

export function FamilyReunificationFlow({ value, onChange }: Props) {
  const v = value ?? {};
  const set = <K extends keyof FamilyAnswers>(key: K, val: FamilyAnswers[K]) =>
    onChange({ ...v, [key]: val });

  const setDoc = (id: string, have: boolean) =>
    onChange({ ...v, documents: { ...(v.documents ?? {}), [id]: have } });

  const evalResult = useMemo(() => evaluateFamily(v), [v]);

  return (
    <div className="space-y-8">
      {/* Entry gate */}
      <section className="space-y-3">
        <h3 className="flc-display text-xl">Sponsor status</h3>
        <Field label="Are you already a Canadian PR or Canadian citizen?">
          <RadioRow
            name="sponsor_status"
            value={v.sponsor_status ?? undefined}
            onChange={(val) => set("sponsor_status", val as any)}
            options={[
              { value: "citizen", label: "Canadian citizen" },
              { value: "pr_holder", label: "Permanent resident" },
            ]}
          />
        </Field>
        <div className="text-xs text-[hsl(220_14%_45%)]">
          Not a PR or citizen? Use the standard PR self-assessment instead — close this flow and pick Permanent Residence.
        </div>
      </section>

      {/* Relationship selection */}
      <section className="space-y-3">
        <h3 className="flc-display text-xl">Who do you want to sponsor?</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {BRANCHES.map((b) => {
            const active = v.branch === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => set("branch", b.id)}
                className={`text-left rounded-xl border p-4 transition ${
                  active
                    ? "border-[hsl(220_18%_11%)] bg-[hsl(220_18%_11%)] text-white"
                    : "border-[hsl(30_12%_82%)] bg-white hover:border-[hsl(220_18%_11%)]"
                }`}
              >
                <div className="text-sm font-semibold">{b.label}</div>
                <div className={`text-xs mt-1 ${active ? "text-white/70" : "text-[hsl(220_14%_45%)]"}`}>{b.hint}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Branch: Spouse */}
      {v.branch === "spouse" && (
        <section className="space-y-4">
          <h3 className="flc-display text-xl">Partner details</h3>
          <Field label="Partner type">
            <RadioRow
              name="partner_type"
              value={v.partner_type}
              onChange={(val) => set("partner_type", val as any)}
              options={[
                { value: "spouse", label: "Spouse (married)" },
                { value: "common_law", label: "Common-law partner" },
                { value: "conjugal", label: "Conjugal partner" },
              ]}
            />
          </Field>
          <Field label="Where is your partner currently located?">
            <RadioRow
              name="partner_location"
              value={v.partner_location}
              onChange={(val) => set("partner_location", val as any)}
              options={[
                { value: "inside_canada", label: "Inside Canada" },
                { value: "outside_canada", label: "Outside Canada" },
                { value: "unsure", label: "Unsure" },
              ]}
            />
          </Field>
          {v.partner_type === "spouse" && (
            <Field label="Are you legally married?"><YesNo value={v.legally_married} onChange={(b) => set("legally_married", b)} /></Field>
          )}
          {v.partner_type === "common_law" && (
            <Field label="Have you cohabited for at least 12 continuous months?"><YesNo value={v.cohabited_12_months} onChange={(b) => set("cohabited_12_months", b)} /></Field>
          )}
          {v.partner_type === "conjugal" && (
            <Field label="Can you show a legal/immigration barrier to marrying or living together?"><YesNo value={v.conjugal_barrier} onChange={(b) => set("conjugal_barrier", b)} /></Field>
          )}
          <Field label="Do you and your partner have dependent children together?"><YesNo value={v.has_children_together} onChange={(b) => set("has_children_together", b)} /></Field>
          <Field label="Family unit size (sponsor + dependants + partner)" hint="Used to look up the IRCC LICO minimum income.">
            <input
              type="number"
              min={1}
              max={20}
              value={(v as any).family_size ?? ""}
              onChange={(e) => set("family_size" as any, e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-32 rounded-lg border border-[hsl(30_12%_82%)] bg-white px-3 py-1.5 text-sm"
            />
          </Field>
          <LicoTable familySize={(v as any).family_size} />
        </section>
      )}

      {/* Branch: Child */}
      {v.branch === "child" && (
        <section className="space-y-4">
          <h3 className="flc-display text-xl">Dependent child details</h3>
          <Field label="Child relationship">
            <RadioRow
              name="child_type"
              value={v.child_type}
              onChange={(val) => set("child_type", val as any)}
              options={[
                { value: "biological", label: "Biological" },
                { value: "adopted", label: "Adopted" },
                { value: "stepchild", label: "Stepchild" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Child location">
            <RadioRow
              name="child_location"
              value={v.child_location}
              onChange={(val) => set("child_location", val as any)}
              options={[
                { value: "inside_canada", label: "Inside Canada" },
                { value: "outside_canada", label: "Outside Canada" },
              ]}
            />
          </Field>
          <Field label="Is the child legally and financially dependent on you?"><YesNo value={v.child_dependent} onChange={(b) => set("child_dependent", b)} /></Field>
          <Field label="Is the child married or in a common-law relationship?"><YesNo value={v.child_married} onChange={(b) => set("child_married", b)} /></Field>
          <Field label="Do you have legal custody / guardianship?"><YesNo value={v.has_custody} onChange={(b) => set("has_custody", b)} /></Field>
        </section>
      )}

      {/* Branch: Parent / Grandparent */}
      {v.branch === "parent" && (
        <section className="space-y-4">
          <h3 className="flc-display text-xl">Parent / Grandparent details</h3>
          <Field label="Relative type">
            <RadioRow
              name="parent_type"
              value={v.parent_type}
              onChange={(val) => set("parent_type", val as any)}
              options={[
                { value: "parent", label: "Parent" },
                { value: "grandparent", label: "Grandparent" },
              ]}
            />
          </Field>
          <Field label="Current location">
            <RadioRow
              name="parent_location"
              value={v.parent_location}
              onChange={(val) => set("parent_location", val as any)}
              options={[
                { value: "outside_canada", label: "Outside Canada" },
                { value: "inside_canada", label: "Inside Canada" },
                { value: "unsure", label: "Unsure" },
              ]}
            />
          </Field>
          <Field label="Which path are you considering?">
            <RadioRow
              name="pathway_preference"
              value={v.pathway_preference}
              onChange={(val) => set("pathway_preference", val as any)}
              options={[
                { value: "super_visa", label: "Super Visa" },
                { value: "pgp", label: "Parent/Grandparent Sponsorship (PGP)" },
                { value: "unsure", label: "Not sure" },
              ]}
            />
          </Field>
          <Field label="Your relationship to them">
            <RadioRow
              name="host_relationship"
              value={v.host_relationship}
              onChange={(val) => set("host_relationship", val as any)}
              options={[
                { value: "child", label: "Their child" },
                { value: "grandchild", label: "Their grandchild" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Can you meet the income / financial requirement (LICO or MNI)?"><YesNo value={v.can_show_income} onChange={(b) => set("can_show_income", b)} /></Field>
          <Field label="Can you prove the family relationship with documents?"><YesNo value={v.can_prove_relationship} onChange={(b) => set("can_prove_relationship", b)} /></Field>
          {v.pathway_preference === "super_visa" && (
            <Field label="Do you have or plan to arrange 1-year medical insurance ($100K)?"><YesNo value={v.has_medical_insurance} onChange={(b) => set("has_medical_insurance", b)} /></Field>
          )}
          <Field label="Family unit size (sponsor + dependants + sponsored persons)" hint="Used to look up the IRCC LICO minimum income.">
            <input
              type="number"
              min={1}
              max={20}
              value={(v as any).family_size ?? ""}
              onChange={(e) => set("family_size" as any, e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-32 rounded-lg border border-[hsl(30_12%_82%)] bg-white px-3 py-1.5 text-sm"
            />
          </Field>
          <LicoTable familySize={(v as any).family_size} isSuperVisa={v.pathway_preference === "super_visa"} />
        </section>
      )}

      {/* Branch: Other */}
      {v.branch === "other" && (
        <section className="space-y-4">
          <h3 className="flc-display text-xl">Other relative</h3>
          <Field label="Relative type">
            <RadioRow
              name="other_relative_type"
              value={v.other_relative_type}
              onChange={(val) => set("other_relative_type", val as any)}
              options={[
                { value: "sibling", label: "Sibling" },
                { value: "aunt_uncle", label: "Aunt / Uncle" },
                { value: "cousin", label: "Cousin" },
                { value: "niece_nephew", label: "Niece / Nephew" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Is the relative already in Canada?"><YesNo value={v.other_in_canada} onChange={(b) => set("other_in_canada", b)} /></Field>
          <Field label="Is this an exceptional or humanitarian situation?"><YesNo value={v.exceptional_case} onChange={(b) => set("exceptional_case", b)} /></Field>
        </section>
      )}

      {/* Document readiness */}
      {v.branch && (
        <section className="space-y-3">
          <h3 className="flc-display text-xl">Document readiness</h3>
          <div className="space-y-1.5">
            {evalResult.checklist.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!c.have}
                  onChange={(e) => setDoc(c.id, e.target.checked)}
                  className="mt-1 size-4 rounded border-[hsl(30_12%_82%)] text-[hsl(220_18%_11%)]"
                />
                <span>
                  {c.label}
                  {c.required && <span className="ml-1 text-[hsl(8_75%_60%)]">*</span>}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Live verdict */}
      {v.branch && evalResult.verdicts.length > 0 && (
        <section className="space-y-3">
          <h3 className="flc-display text-xl">Pathway assessment</h3>
          <div className="space-y-3">
            {evalResult.verdicts.map((verdict, i) => {
              const tone =
                verdict.status === "likely" ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : verdict.status === "not_eligible" ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-amber-50 border-amber-200 text-amber-900";
              return (
                <div key={i} className={`rounded-lg border p-3 ${tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{verdict.label}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider">{verdict.status.replace("_", " ")}</div>
                  </div>
                  {verdict.reasons.length > 0 && (
                    <ul className="text-xs mt-2 space-y-0.5 list-disc pl-4">
                      {verdict.reasons.map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  )}
                </div>
              );
            })}
            {evalResult.nextActions.length > 0 && (
              <div className="rounded-lg border border-[hsl(30_12%_82%)] p-3 bg-white">
                <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(220_14%_28%)] mb-1.5">Next actions</div>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {evalResult.nextActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default FamilyReunificationFlow;