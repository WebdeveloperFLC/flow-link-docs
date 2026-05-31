import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FileText, FileUp, Filter, ListChecks, ChevronRight } from "lucide-react";

type FeeItem = {
  label: string;
  amount: string;
};

type LibraryRecord = {
  country: string;
  serviceCategory: string;
  service: string;
  subService: string;
  checklist: string;
  fees: FeeItem[];
  processFlow: string[];
  attachmentLabel: string;
};

const records: LibraryRecord[] = [
  {
    country: "Canada",
    serviceCategory: "Visa & Immigration Services",
    service: "Study Permit",
    subService: "SDS",
    checklist:
      "Passport, LOA, tuition receipt, GIC, IELTS, bank statements, photographs, forms, SOP, education documents.",
    fees: [
      { label: "Embassy fee", amount: "CAD 150" },
      { label: "Biometrics", amount: "CAD 85" },
      { label: "Consulting fee", amount: "CAD 1,500" },
      { label: "Other fee", amount: "Medical / translation / courier as applicable" },
    ],
    processFlow: ["Profile review", "Checklist preparation", "File submission", "Biometrics", "Decision"],
    attachmentLabel: "Canada SDS checklist PDF",
  },
  {
    country: "UK",
    serviceCategory: "Visa & Immigration Services",
    service: "Student Visa",
    subService: "New Application",
    checklist: "CAS, passport, bank statements, academic docs, English test, TB test, application form.",
    fees: [
      { label: "Embassy fee", amount: "GBP 490" },
      { label: "Biometrics", amount: "Included" },
      { label: "Consulting fee", amount: "GBP 1,200" },
      { label: "Other fee", amount: "IHS / translation / courier as applicable" },
    ],
    processFlow: ["Eligibility review", "Document review", "Submission", "Biometrics", "Result"],
    attachmentLabel: "UK student visa checklist PDF",
  },
  {
    country: "USA",
    serviceCategory: "Visa & Immigration Services",
    service: "F1 Visa",
    subService: "Initial Filing",
    checklist: "DS-160, I-20, SEVIS receipt, passport, financial documents, academic records, interview prep.",
    fees: [
      { label: "Embassy fee", amount: "USD 185" },
      { label: "Biometrics", amount: "Included in appointment" },
      { label: "Consulting fee", amount: "USD 1,500" },
      { label: "Other fee", amount: "SEVIS / translation / courier as applicable" },
    ],
    processFlow: ["Profile review", "DS-160", "Document prep", "Interview prep", "Decision"],
    attachmentLabel: "USA F1 checklist PDF",
  },
];

export default function ServiceLibrary() {
  const [country, setCountry] = useState(records[0].country);
  const [serviceCategory, setServiceCategory] = useState(records[0].serviceCategory);
  const [service, setService] = useState(records[0].service);
  const [subService, setSubService] = useState(records[0].subService);

  const countries = useMemo(() => [...new Set(records.map((r) => r.country))], []);
  const serviceCategories = useMemo(
    () => [...new Set(records.filter((r) => r.country === country).map((r) => r.serviceCategory))],
    [country],
  );
  const services = useMemo(
    () =>
      [...new Set(records.filter((r) => r.country === country && r.serviceCategory === serviceCategory).map((r) => r.service))],
    [country, serviceCategory],
  );
  const subServices = useMemo(
    () =>
      [...new Set(records.filter((r) => r.country === country && r.serviceCategory === serviceCategory && r.service === service).map((r) => r.subService))],
    [country, serviceCategory, service],
  );

  const selected = useMemo(
    () =>
      records.find(
        (r) => r.country === country && r.serviceCategory === serviceCategory && r.service === service && r.subService === subService,
      ) ?? records[0],
    [country, serviceCategory, service, subService],
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ListChecks className="h-4 w-4" />
            Checklist & Fee Library
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Country-wise checklist and fee reference</h1>
          <p className="mt-2 text-sm text-slate-600">
            Counselors can filter by country, service category, service, and sub-service, then view checklist text, fee structure, process flow, and attachments.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-4">
            <Panel title="Filters" icon={<Filter className="h-4 w-4" />}>
              <Field label="Country">
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  value={country}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    setCountry(nextCountry);
                    const firstCategory = records.find((r) => r.country === nextCountry)?.serviceCategory ?? "";
                    setServiceCategory(firstCategory);
                    const firstService = records.find((r) => r.country === nextCountry && r.serviceCategory === firstCategory)?.service ?? "";
                    setService(firstService);
                    const firstSub = records.find(
                      (r) => r.country === nextCountry && r.serviceCategory === firstCategory && r.service === firstService,
                    )?.subService ?? "";
                    setSubService(firstSub);
                  }}
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Service Category">
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  value={serviceCategory}
                  onChange={(e) => {
                    const next = e.target.value;
                    setServiceCategory(next);
                    const firstService = records.find((r) => r.country === country && r.serviceCategory === next)?.service ?? "";
                    setService(firstService);
                    const firstSub = records.find(
                      (r) => r.country === country && r.serviceCategory === next && r.service === firstService,
                    )?.subService ?? "";
                    setSubService(firstSub);
                  }}
                >
                  {serviceCategories.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Service">
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  value={service}
                  onChange={(e) => {
                    const next = e.target.value;
                    setService(next);
                    const firstSub = records.find(
                      (r) => r.country === country && r.serviceCategory === serviceCategory && r.service === next,
                    )?.subService ?? "";
                    setSubService(firstSub);
                  }}
                >
                  {services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Sub-service">
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  value={subService}
                  onChange={(e) => setSubService(e.target.value)}
                >
                  {subServices.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </Panel>

            <Panel title="Available file" icon={<FileUp className="h-4 w-4" />}>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                {selected.attachmentLabel}
              </div>
            </Panel>
          </div>

          <div className="space-y-6 xl:col-span-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Checklist" icon={<FileText className="h-4 w-4" />}>
                <div className="text-sm leading-6 text-slate-700">{selected.checklist}</div>
              </Panel>

              <Panel title="Fee structure" icon={<ListChecks className="h-4 w-4" />}>
                <div className="space-y-3">
                  {selected.fees.map((fee) => (
                    <div key={fee.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <span className="text-slate-600">{fee.label}</span>
                      <span className="font-medium text-slate-900">{fee.amount}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="Process flow" icon={<ChevronRight className="h-4 w-4" />}>
              <div className="flex flex-wrap items-center gap-3">
                {selected.processFlow.map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium">
                      {index + 1}. {step}
                    </div>
                    {index < selected.processFlow.length - 1 && <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      {children}
    </div>
  );
}
