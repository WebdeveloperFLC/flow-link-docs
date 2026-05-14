import { ChatMessage, Conversation, RichBlock } from "../types/aiChat";

export const QUICK_QUESTIONS = [
  "Why did expenses spike in October?",
  "Show outstanding receivables over 90 days",
  "Which vendors have duplicate invoices?",
  "What are my tax deadlines this month?",
  "Explain the Canada branch P&L drop",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function msg(role: "user" | "assistant", content: string, blocks?: RichBlock[]): ChatMessage {
  return { id: uid(), role, content, blocks, createdAt: new Date().toISOString() };
}

/** Pre-scripted assistant responses keyed loosely by topic. */
export function mockReply(prompt: string): ChatMessage {
  const p = prompt.toLowerCase();

  if (p.includes("october") || p.includes("expense") || p.includes("spike")) {
    return msg(
      "assistant",
      `**October expenses rose 23% MoM**, primarily driven by three categories. The variance is real, not a posting error — I cross-checked journal entries and PO matches.\n\n- **Marketing** spend doubled vs. September, in line with the Q4 product launch.\n- **Cloud infrastructure** grew 41% — mostly the new India region rollout.\n- **Travel** spiked due to the Toronto leadership offsite (Oct 14–18).\n\nNet impact on operating margin: **-2.4 pts**.`,
      [
        {
          kind: "metric",
          payload: {
            items: [
              { label: "Total opex Oct", value: "$1.84M", delta: "+23% MoM", tone: "down" },
              { label: "Marketing", value: "$420K", delta: "+102%", tone: "down" },
              { label: "Cloud", value: "$285K", delta: "+41%", tone: "down" },
              { label: "Travel", value: "$96K", delta: "+180%", tone: "down" },
            ],
          },
        },
        {
          kind: "chart",
          payload: {
            title: "Monthly opex trend (CAD)",
            data: [
              { x: "May", y: 1.32 },
              { x: "Jun", y: 1.4 },
              { x: "Jul", y: 1.38 },
              { x: "Aug", y: 1.45 },
              { x: "Sep", y: 1.5 },
              { x: "Oct", y: 1.84 },
            ],
          },
        },
        { kind: "reportLink", payload: { label: "Open October P&L", href: "/accounting/reports/pl", description: "Full P&L breakdown with drill-downs" } },
      ],
    );
  }

  if (p.includes("receivable") || p.includes("ar") || p.includes("90")) {
    return msg(
      "assistant",
      `You have **CAD 487,200 in receivables aged over 90 days** across 14 customers. Three accounts represent 62% of the overdue balance and should be prioritised for collection.`,
      [
        {
          kind: "table",
          payload: {
            caption: "Top overdue customers (>90 days)",
            columns: ["Customer", "Days", "Amount", "Last contact"],
            rows: [
              ["Northwind Holdings", 142, "$128,400", "Apr 21"],
              ["Global Imports Ltd", 118, "$94,800", "May 02"],
              ["Pacific Ventures", 96, "$78,200", "Apr 28"],
              ["Atlas Brokerage", 91, "$42,100", "May 09"],
            ],
          },
        },
        {
          kind: "metric",
          payload: {
            items: [
              { label: "Total overdue >90d", value: "$487,200", delta: "14 customers", tone: "down" },
              { label: "Top 3 share", value: "62%", tone: "neutral" },
              { label: "Avg DSO", value: "78 days", delta: "+9d vs target", tone: "down" },
            ],
          },
        },
        { kind: "reportLink", payload: { label: "Open AR aging report", href: "/accounting/reports/bs", description: "Drill into receivables by aging bucket" } },
      ],
    );
  }

  if (p.includes("duplicate") || p.includes("vendor")) {
    return msg(
      "assistant",
      `I found **3 vendors with likely duplicate invoices** in the last 30 days. The strongest signal is **Acme Logistics Inc.** — same amount, same reference pattern, paid 3 days apart.`,
      [
        {
          kind: "table",
          payload: {
            columns: ["Vendor", "Duplicates", "Total at risk", "Confidence"],
            rows: [
              ["Acme Logistics Inc.", 2, "$24,961", "92%"],
              ["Bharat Office Supplies", 3, "₹375,000", "78%"],
              ["Pacific Travel Co.", 2, "$12,840", "71%"],
            ],
          },
        },
        { kind: "reportLink", payload: { label: "Open Fraud & Audit", href: "/accounting/fraud", description: "Review and action all flagged transactions" } },
      ],
    );
  }

  if (p.includes("tax") || p.includes("deadline")) {
    return msg(
      "assistant",
      `You have **4 tax deadlines this month** across Canada, US, and India. The HST/GST filing is the closest — due in 6 days.`,
      [
        {
          kind: "table",
          payload: {
            columns: ["Jurisdiction", "Filing", "Due date", "Est. amount"],
            rows: [
              ["Canada (CRA)", "HST/GST Q2", "May 20", "$48,200"],
              ["USA (IRS)", "Form 941 payroll", "May 22", "$31,500"],
              ["India (GSTN)", "GSTR-3B", "May 25", "₹612,400"],
              ["Canada (CRA)", "Corporate instalment", "May 31", "$120,000"],
            ],
          },
        },
      ],
    );
  }

  if (p.includes("canada") || p.includes("p&l") || p.includes("branch")) {
    return msg(
      "assistant",
      `The **Canada branch P&L declined CAD 142K vs prior quarter**, mostly from a one-time legal accrual and FX revaluation. Underlying operating performance is actually flat.\n\n*Adjusted EBITDA* (excluding one-offs) is **CAD 612K**, in line with Q2.`,
      [
        {
          kind: "metric",
          payload: {
            items: [
              { label: "Reported net", value: "$470K", delta: "-23% QoQ", tone: "down" },
              { label: "Legal accrual", value: "($95K)", tone: "down" },
              { label: "FX revaluation", value: "($47K)", tone: "down" },
              { label: "Adjusted EBITDA", value: "$612K", delta: "Flat QoQ", tone: "neutral" },
            ],
          },
        },
        { kind: "reportLink", payload: { label: "Open Consolidated report", href: "/accounting/reports/consolidated", description: "Side-by-side entity comparison" } },
      ],
    );
  }

  return msg(
    "assistant",
    `I can help with that. Here's a quick summary based on the latest posted data — let me know if you'd like me to drill into a specific entity, account, or period.\n\n*Try one of the quick questions on the left for a richer answer.*`,
  );
}

export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    title: "October expense spike",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    messages: [
      msg("user", "Why did expenses spike in October?"),
      mockReply("Why did expenses spike in October?"),
    ],
  },
  {
    id: "c2",
    title: "Receivables over 90 days",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    messages: [],
  },
  {
    id: "c3",
    title: "Q2 tax deadlines",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    messages: [],
  },
];