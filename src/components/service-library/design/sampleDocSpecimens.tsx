import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SpecimenDoc = {
  title: string;
  description?: string;
  docKind?: string;
  mimeType?: string;
};

function Watermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.07]"
      aria-hidden
    >
      <span className="text-4xl font-black rotate-[-24deg] tracking-widest text-destructive">MOCK SPECIMEN</span>
    </div>
  );
}

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative rounded-lg border bg-white text-slate-900 shadow-inner overflow-hidden", className)}>
      <Watermark />
      <div className="relative p-4 sm:p-6 text-xs sm:text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function PassportSpecimen() {
  return (
    <Frame>
      <div className="flex gap-4">
        <div className="w-24 h-32 bg-slate-200 border flex items-center justify-center text-[10px] text-slate-500 shrink-0">
          Photo
        </div>
        <div className="flex-1 space-y-2 font-mono">
          <div className="text-[10px] uppercase text-slate-500">Republic of India · Passport</div>
          <div><span className="text-slate-500">Surname / Given names</span><br /><strong>SAMPLE / JOHN ARUN</strong></div>
          <div><span className="text-slate-500">Passport No.</span><br /><strong>P1234567</strong></div>
          <div><span className="text-slate-500">Nationality</span><br /><strong>INDIAN</strong></div>
          <div><span className="text-slate-500">Date of birth</span><br /><strong>01 JAN 1998</strong></div>
          <div><span className="text-slate-500">Date of expiry</span><br /><strong>01 JAN 2033</strong></div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-dashed font-mono text-[10px] tracking-wider text-slate-600">
        P&lt;INDSAMPLE&lt;&lt;JOHN&lt;ARUN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
      </div>
    </Frame>
  );
}

function BankStatementSpecimen() {
  return (
    <Frame>
      <div className="font-semibold text-sm mb-3">Sample Bank · Account Statement (Mock)</div>
      <div className="grid grid-cols-2 gap-2 mb-4 text-[11px]">
        <div>Account holder: <strong>John A. Sample</strong></div>
        <div>Account: <strong>XXXX-4821</strong></div>
        <div>Period: <strong>Dec 2025 – May 2026</strong></div>
        <div>Closing balance: <strong>₹ 18,42,500</strong></div>
      </div>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="text-left p-1">Date</th>
            <th className="text-left p-1">Description</th>
            <th className="text-right p-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b"><td className="p-1">02 Jan</td><td>Salary credit</td><td className="text-right p-1">+ ₹ 85,000</td></tr>
          <tr className="border-b"><td className="p-1">15 Feb</td><td>Fixed deposit interest</td><td className="text-right p-1">+ ₹ 12,400</td></tr>
          <tr className="border-b"><td className="p-1">01 Mar</td><td>Tuition transfer</td><td className="text-right p-1">- ₹ 4,50,000</td></tr>
        </tbody>
      </table>
      <p className="mt-3 text-[10px] text-slate-500">Counselor note: explain 4–6 month history and source of large credits.</p>
    </Frame>
  );
}

function LetterSpecimen({ heading, body }: { heading: string; body: string[] }) {
  return (
    <Frame>
      <div className="text-[10px] text-slate-500 mb-2">{new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}</div>
      <div className="font-semibold text-sm mb-3">{heading}</div>
      <div className="space-y-2 text-[11px]">
        {body.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t text-[11px]">
        <div className="font-medium">Authorized signatory</div>
        <div className="text-slate-500">Future Link Consultants · Mock specimen only</div>
      </div>
    </Frame>
  );
}

function WorkPermitSpecimen() {
  return (
    <Frame>
      <div className="text-center border-b pb-3 mb-3">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">Government of Canada</div>
        <div className="font-bold text-sm">Work Permit · Specimen</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>Name: <strong>John A. Sample</strong></div>
        <div>UCI: <strong>1234-5678</strong></div>
        <div>Employer: <strong>Acme Tech Inc.</strong></div>
        <div>LMIA-exempt: <strong>CUSMA / IEC / etc.</strong></div>
        <div>Valid from: <strong>01 Sep 2025</strong></div>
        <div>Expiry: <strong>01 Sep 2027</strong></div>
      </div>
      <p className="mt-3 text-[10px] text-amber-700 bg-amber-50 p-2 rounded">Not valid for travel — specimen for counselor training.</p>
    </Frame>
  );
}

function PhotoSpecimen() {
  return (
    <Frame className="max-w-xs mx-auto">
      <div className="aspect-[3/4] bg-slate-100 border-2 border-slate-300 flex flex-col items-center justify-center gap-2">
        <div className="w-20 h-24 bg-slate-300 rounded-sm" />
        <span className="text-[10px] text-slate-500">IRCC photo specs · white background · 420×540 px</span>
      </div>
    </Frame>
  );
}

function TrfSpecimen() {
  return (
    <Frame>
      <div className="font-bold text-sm mb-2">IELTS Test Report Form · Mock</div>
      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
        {["L 7.5", "R 8.0", "W 7.0", "S 7.5"].map((s) => (
          <div key={s} className="border rounded p-2 bg-slate-50 font-semibold">{s}</div>
        ))}
      </div>
      <div className="mt-3 text-[11px]">Candidate: <strong>John A. Sample</strong> · TRF: <strong>24IN123456SAMPLE</strong></div>
    </Frame>
  );
}

function GenericDocSpecimen({ doc }: { doc: SpecimenDoc }) {
  return (
    <Frame>
      <div className="font-semibold text-sm mb-2">{doc.title.replace(/\s*\(mock\)\s*/i, "")}</div>
      {doc.description && <p className="text-[11px] text-slate-600 mb-4">{doc.description}</p>}
      <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700">
        <li>Client name and dates must match the application forms.</li>
        <li>Use clear scans — no glare, full page visible.</li>
        <li>Replace this specimen with a real redacted client example in Admin when available.</li>
      </ul>
    </Frame>
  );
}

export function SampleDocSpecimenContent({ doc }: { doc: SpecimenDoc }) {
  const t = doc.title.toLowerCase();

  if (t.includes("passport")) return <PassportSpecimen />;
  if (t.includes("bank") || doc.docKind === "financial") return <BankStatementSpecimen />;
  if (t.includes("photo")) return <PhotoSpecimen />;
  if (t.includes("work permit") && !t.includes("open")) return <WorkPermitSpecimen />;
  if (t.includes("ielts") || t.includes("pte") || t.includes("trf") || t.includes("toefl")) return <TrfSpecimen />;
  if (t.includes("loa") || t.includes("acceptance") || t.includes("cas") || t.includes("i-20") || t.includes("coe")) {
    return (
      <LetterSpecimen
        heading="Letter of Acceptance · Mock"
        body={[
          "Dear John A. Sample,",
          "We are pleased to offer you admission to the Bachelor of Computer Science program at Sample Designated Learning Institution.",
          "Program start date: 01 September 2026 · Duration: 4 years · Tuition (year 1): CAD $24,500.",
          "This letter is issued for study permit application purposes only.",
        ]}
      />
    );
  }
  if (t.includes("aor") || t.includes("acknowledgement")) {
    return (
      <LetterSpecimen
        heading="Acknowledgement of Receipt (AOR) · Mock"
        body={[
          "Application number: EP123456789",
          "We received your application for permanent residence in Canada on 15 March 2026.",
          "Class: Canadian Experience Class (CEC) · Current stage: Acknowledgement of receipt.",
          "This document may support Bridging Open Work Permit eligibility — verify current IRCC instructions.",
        ]}
      />
    );
  }
  if (t.includes("invitation")) {
    return (
      <LetterSpecimen
        heading="Invitation Letter · Mock"
        body={[
          "I, Jane Sample, invite my brother John A. Sample to visit me in Toronto, Canada from 01 July to 15 August 2026.",
          "I will provide accommodation at 123 Sample Street. I am a permanent resident of Canada.",
          "John will cover his own travel expenses and return to India after the visit.",
        ]}
      />
    );
  }
  if (t.includes("employment") || doc.docKind === "employment") {
    return (
      <LetterSpecimen
        heading="Employment Confirmation · Mock"
        body={[
          "This confirms John A. Sample is employed full-time as Software Developer since 01 Jan 2022.",
          "Annual salary: ₹ 12,00,000. Leave approved from 01 July to 15 August 2026 for personal travel.",
          "We expect him to resume duties upon return to India.",
        ]}
      />
    );
  }
  if (t.includes("explanation") || t.includes("sop") || t.includes("statement")) {
    return (
      <LetterSpecimen
        heading="Explanation / Statement · Mock"
        body={[
          "Purpose: Bridging Open Work Permit while permanent residence application is in processing.",
          "Current status: Worker in Canada · PR AOR received · Current work permit expires 30 April 2026.",
          "Client will maintain legal status and comply with all permit conditions.",
        ]}
      />
    );
  }
  if (t.includes("insurance")) {
    return (
      <LetterSpecimen
        heading="Super Visa Insurance Policy · Mock"
        body={[
          "Insured: John A. Sample · Coverage: CAD $100,000 · Valid: 12 months from entry.",
          "Policy meets IRCC Super Visa medical insurance requirements.",
          "Issued by Sample Canadian Insurance Co. — specimen only.",
        ]}
      />
    );
  }

  return <GenericDocSpecimen doc={doc} />;
}
