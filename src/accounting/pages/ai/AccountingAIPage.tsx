import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import {
  Sparkles,
  Plus,
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  AlertCircle,
  Calendar,
  ArrowUpCircle,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ENTITY_DATA, PL_DATA, MONTHLY_DATA } from "../../data/mockReports";
import { MOCK_INVOICES } from "../../data/mockAR";
import { MOCK_BILLS } from "../../data/mockAP";
import { MOCK_TAX_PERIODS, MOCK_NOTICES } from "../../data/mockTax";
import { MOCK_FRAUD_FLAGS } from "../../data/mockFraud";

const SYSTEM_PROMPT = `You are the AI financial analyst for Future Link Consultants, embedded inside their accounting ERP called Future Link Flow.

Future Link Consultants is a multi-country education and immigration consultancy. Services include: IELTS/TOEFL/PTE coaching, language courses, student visas, PR applications, study abroad packages, university admissions, and more.

LEGAL ENTITIES:

INDIA LEGAL ENTITIES (MCA verified):

1. Future Link Consultants Private Limited
   CIN: U74999GJ2021PTC123559
   PAN: AAECF6140K
   TAN: BRDF00780D
   GSTIN: 24AAECF6140K1ZP
   Incorporated: 24 June 2021
   Address: Shop 215-216, Atlantis, Vadivadi, Sarabhai Compound, Vadodara, Gujarat 390023
   Directors: Santosh Dwarkadas Ramrakhiani, Krishaa Santosh Ramrakhiani
   Status: PRIMARY entity — all services transitioning here from legacy entities
   Branches: Vadodara Genda Circle (HO), Bhayli, Karelibaug, Manjalpur, Ajwa Road, Anand.

2. Future Link Visa Consultants Pvt Ltd
   CIN: U74900GJ2009PTC057220
   PAN: AABCF3724G
   GSTIN: 24AABCF3724G1Z1
   Incorporated: 10 June 2009
   Address: 216 Atlantis, Opp Vadodara Central, Nr. Genda Circle, Vadodara, Gujarat 390023
   Directors: Santosh Dwarkadas Ramrakhiani, Krishaa Santosh Ramrakhiani
   Status: Legacy — immigration & visa services (transitioning to FL Consultants)

3. Future Link Academic Excellence Pvt Ltd
   CIN: U74991GJ2017PTC096530
   PAN: AADCF0528Q
   GSTIN: to be confirmed
   Incorporated: 27 March 2017
   Formerly: Future Link Educational and Immigration Services Pvt Ltd (name changed April 2017)
   Address: 216 Atlantis Complex, Opp Vadodara Central, Nr. Genda Circle, Vadodara 390023
   Directors: Santosh Dwarkadas Ramrakhiani, Krishaa Santosh Ramrakhiani
   Status: Legacy — coaching services (transitioning to FL Consultants)

Note: Company is in transition — moving all operations under Future Link Consultants Pvt Ltd. Last 5 years of historical data spans all 3 entities. When answering questions about India operations, consider all 3 companies unless entity specified.

CANADA LEGAL ENTITIES (CRA verified):

CRA PROGRAM ACCOUNT FORMAT:
  BN (9 digits) = base business number
  RC = Corporate Income Tax account
  RT = GST/HST account
  RP = Payroll deductions account

1. FUTURE LINK CONSULTANTS INC.
   BN: 851089714
   Corporate Tax RC: 851089714RC0001
   GST/HST RT: 851089714RT0001
   Payroll RP: 851089714RP0001
   Taxation year end: August 31
   Fiscal year: September 1 to August 31
   T2 Corporate Tax due: February 28
   HST filing: quarterly from August 31
   Address: 5 Vandorf Street, Toronto, Ontario M1B 4Y3, Canada
   Phone: +1 416 902 4524
   Status: Main Canada operating company

2. FUTUREWAY CONSULTANTS INC.
   BN: 819356389
   Corporate Tax RC: 819356389RC0001
   GST/HST RT: 819356389RT0001
   Payroll RP: 819356389RP0001
   Taxation year end: December 31
   Fiscal year: January 1 to December 31
   T2 Corporate Tax due: June 30
   Address: 5 Vandorf Street, Toronto, Ontario M1B 4Y3, Canada
   Status: Canada registered company

3. 2709223 ONTARIO INC.
   BN: 778840876
   Corporate Tax RC: 778840876RC0001
   GST/HST RT: 778840876RT0001
   Payroll RP: 778840876RP0001
   Taxation year end: December 31
   Fiscal year: January 1 to December 31
   T2 Corporate Tax due: June 30
   Address: 5 Vandorf Street, Toronto, Ontario M1B 4Y3, Canada
   Status: Ontario numbered company

IMPORTANT FISCAL YEAR DIFFERENCES:
  Future Link Consultants Inc: Sep 1 to Aug 31 (unique); T2 due Feb 28 each year
  Future Way + Ontario Inc: Jan 1 to Dec 31; T2 due Jun 30 each year
  India entities: Apr 1 to Mar 31
  Always clarify entity when discussing year-end or tax filing deadlines.

HST INVOICING NOTE:
  When generating invoices for Future Link Consultants Inc use:
  GST/HST Registration: 851089714RT0001
  (RT suffix = HST/GST account, not RC)

All Canada entities operate from Toronto, Ontario. Payments from USA clients collected here or in India.

USA: Office only in Finksburg, Maryland. No US legal entity registered. No US bank accounts. Payments collected via Canada or India.

BANK ACCOUNTS:
India banks:
- INR operating accounts (multiple Indian banks)
- Foreign currency CAD account (FCNR/RFC) held with Indian bank
- Foreign currency USD account (FCNR/RFC) held with Indian bank

Canada banks (TD Canada Trust):
- CAD business chequing account
- USD business account
Note: TD Canada Trust SWIFT: TDOMCATTTOR

FOREIGN CURRENCY ACCOUNTING RULES:
When commission received from Canadian institutions:
  Option A — received in Canada TD CAD account: DR TD Bank CAD / CR Commission Revenue CAD
  Option B — received in India FCNR CAD account: DR FCNR CAD (India) / CR Commission Revenue CAD
  When converted to INR: DR INR Bank / CR FCNR CAD account; DR/CR Forex Gain/Loss (difference)

When commission received from UK/Australia institutions (GBP/AUD):
  Received in India FCNR USD or direct INR: DR Bank / CR Commission Revenue; Forex difference → Forex Gain/Loss account

ENTITY TRANSITION NOTE:
Historical entries (last 5 years) may be posted to any of the 3 Indian companies. This is by design during the transition period. When asked about profitability or balances, check across all 3 Indian entities for a complete picture.

You have access to the company's real accounting data provided in each message as JSON context. This includes: journal entries, vendor bills, client invoices, tax filings, fraud flags, and financial reports.

YOUR RULES:
1. Always cite specific numbers from the context
2. State the time period for all figures
3. Format currency correctly: CAD → CA$, USD → US$, INR → ₹, AED → AED, GBP → £, AUD → A$
4. Never invent or estimate numbers not in context
5. If data is insufficient say so clearly
6. Flag fraud or compliance issues prominently
7. Be concise — lead with the answer, then detail
8. Use bullet points for lists of items
9. Bold important numbers and key findings
10. End with actionable next steps when relevant

You can answer questions about: revenue and expense analysis, profitability by entity or service type, outstanding receivables and payables, tax deadlines and compliance status, fraud alerts and risk indicators, cash flow and bank positions, client and vendor analysis, budget vs actual comparisons, branch performance comparisons.`;

const ENTITIES = [
  "All entities",
  // India
  "Future Link Consultants Pvt Ltd",
  "Future Link Visa Consultants Pvt Ltd",
  "Future Link Academic Excellence Pvt Ltd",
  // Canada
  "Future Link Consultants Inc",
  "Future Way Consultants Inc",
  "Ontario Inc 2709223",
] as const;

const QUICK_QUESTIONS = [
  "Why did expenses spike in October?",
  "Which clients have invoices overdue 60+ days?",
  "What are my tax deadlines this month?",
  "Show outstanding AP by vendor",
  "Which entity is most profitable?",
  "Are there any critical fraud alerts?",
  "What is my total outstanding AR?",
  "Compare revenue: India vs Canada",
  "Which service generates most revenue?",
  "Show cash position across all banks",
];

const FEATURED = [
  { icon: TrendingUp, title: "Revenue analysis", q: "Which entity generated most revenue YTD?" },
  { icon: AlertCircle, title: "Fraud alerts", q: "Show me all critical fraud flags" },
  { icon: Calendar, title: "Tax deadlines", q: "What taxes are due in the next 30 days?" },
  { icon: ArrowUpCircle, title: "Outstanding AR", q: "Which clients owe us the most money?" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const TODAY = new Date("2024-11-01");
const DAY = 86400000;

function buildContext(selectedEntity: string): string {
  const filterEntity = (e?: string) =>
    selectedEntity === "All entities" || e === selectedEntity;

  const entities = ENTITY_DATA.filter((e) => filterEntity(e.entity));
  const invoices = MOCK_INVOICES.filter((i) => filterEntity(i.entity));
  const bills = MOCK_BILLS.filter((b) => filterEntity(b.entity));
  const taxes = MOCK_TAX_PERIODS.filter((t) => filterEntity(t.entity));
  const flags = MOCK_FRAUD_FLAGS.filter(
    (f) => filterEntity(f.entity) && (f.status === "OPEN" || f.status === "UNDER_REVIEW")
  );
  const notices = MOCK_NOTICES.filter((n: any) => filterEntity(n.entity));

  const totalRevenue = PL_DATA.revenue.reduce((s, l) => s + l.current, 0);
  const totalCOR = PL_DATA.costOfRevenue.reduce((s, l) => s + l.current, 0);
  const totalOpex = PL_DATA.operatingExpenses.reduce((s, l) => s + l.current, 0);
  const netProfit = totalRevenue - totalCOR - totalOpex - PL_DATA.taxExpense;

  const overdueInv = invoices.filter((i) => i.status === "OVERDUE");
  const overdueBills = bills.filter((b) => b.status === "OVERDUE");

  const next60 = TODAY.getTime() + 60 * DAY;
  const taxNext60 = taxes.filter((t) => {
    const due = new Date(t.dueDate).getTime();
    return t.filingStatus !== "FILED" && due <= next60;
  });

  const ctx = {
    asOf: "2024-11-01",
    scope: selectedEntity,
    entities: entities.map((e) => ({
      name: e.entity,
      currency: e.currency,
      revenue: e.revenue,
      expenses: e.expenses,
      profit: e.profit,
      margin_pct: e.margin,
    })),
    pnl_summary: {
      currency_base: "CAD",
      total_revenue: totalRevenue,
      total_cost_of_revenue: totalCOR,
      total_operating_expenses: totalOpex,
      tax_expense: PL_DATA.taxExpense,
      net_profit: netProfit,
    },
    accounts_receivable: {
      total_invoices: invoices.length,
      total_outstanding: invoices
        .filter((i) => i.status !== "PAID" && i.status !== "VOID")
        .reduce((s, i) => s + i.totalAmount, 0),
      overdue_count: overdueInv.length,
      overdue_amount: overdueInv.reduce((s, i) => s + i.totalAmount, 0),
      top_overdue: overdueInv
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5)
        .map((i) => ({
          invoice: i.invoiceNumber,
          client: i.client,
          entity: i.entity,
          amount: i.totalAmount,
          currency: i.currency,
          due: i.dueDate,
          service: i.serviceType,
        })),
    },
    accounts_payable: {
      total_bills: bills.length,
      total_outstanding: bills
        .filter((b) => b.status !== "PAID" && b.status !== "VOID")
        .reduce((s, b) => s + b.totalAmount, 0),
      overdue_count: overdueBills.length,
      overdue_amount: overdueBills.reduce((s, b) => s + b.totalAmount, 0),
      top_overdue: overdueBills
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5)
        .map((b) => ({
          bill: b.billNumber,
          vendor: b.vendor,
          entity: b.entity,
          amount: b.totalAmount,
          currency: b.currency,
          due: b.dueDate,
        })),
    },
    tax_deadlines_next_60_days: taxNext60.slice(0, 12).map((t) => ({
      entity: t.entity,
      country: t.country,
      type: t.taxTypeName,
      period: t.period,
      due: t.dueDate,
      status: t.filingStatus,
      amount: t.taxAmount,
      currency: t.currency,
    })),
    open_compliance_notices: notices.slice(0, 6).map((n: any) => ({
      entity: n.entity,
      authority: n.authority,
      type: n.noticeType,
      number: n.noticeNumber,
      status: n.status,
    })),
    open_fraud_flags: flags.slice(0, 12).map((f) => ({
      type: f.flagType,
      severity: f.severity,
      status: f.status,
      entity: f.entity,
      description: f.description,
      amount: f.affectedAmount,
      currency: f.currency,
      risk_score: f.riskScore,
    })),
    monthly_trend_last_6: MONTHLY_DATA.slice(-6),
  };

  return JSON.stringify(ctx, null, 2);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(text: string): string {
  let out = escapeHtml(text);
  // Headings
  out = out.replace(/^##\s+(.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>');
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>");
  // Currency highlight
  out = out.replace(
    /(CA\$|US\$|A\$|₹|AED|£|€)\s?([\d,]+(?:\.\d+)?[KMB]?)/g,
    '<span class="text-primary font-medium">$1$2</span>'
  );
  // Bullet lines → <li>
  out = out.replace(/^[-•]\s+(.+)$/gm, '<li class="ml-5 list-disc">$1</li>');
  // Wrap consecutive <li>
  out = out.replace(/(?:<li[^>]*>.*?<\/li>\s*)+/g, (m) => `<ul class="space-y-1 my-2">${m}</ul>`);
  // Line breaks
  out = out.replace(/\n/g, "<br/>");
  return out;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface SidebarBodyProps {
  history: string[];
  onNew: () => void;
  onQuick: (q: string) => void;
  onLoadHistory: (q: string) => void;
  selectedEntity: string;
  setSelectedEntity: (v: string) => void;
}

function SidebarBody({
  history,
  onNew,
  onQuick,
  onLoadHistory,
  selectedEntity,
  setSelectedEntity,
}: SidebarBodyProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <div className="text-sm font-medium">AI assistant</div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={onNew}>
          <Plus className="size-4" />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 border-t">
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">No past conversations yet.</p>
        ) : (
          history.map((h, i) => (
            <button
              key={i}
              onClick={() => onLoadHistory(h)}
              className="w-full text-left text-xs text-muted-foreground p-2 rounded hover:bg-muted truncate"
              title={h}
            >
              {h.length > 40 ? `${h.slice(0, 40)}…` : h}
            </button>
          ))
        )}
      </div>

      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">Quick questions</div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onQuick(q)}
              className="text-xs bg-muted rounded-full px-3 py-1.5 hover:bg-muted/70 transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground mb-1.5">Asking about:</div>
        <Select value={selectedEntity} onValueChange={setSelectedEntity}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e} className="text-xs">
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function AccountingAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>("All entities");
  const [history, setHistory] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea (max 4 rows)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 20;
    const max = lineHeight * 4 + 24;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [input]);

  function clearConversation() {
    if (messages.length > 0) {
      const firstUserMsg = messages.find((m) => m.role === "user")?.content;
      if (firstUserMsg) {
        setHistory((prev) => [firstUserMsg, ...prev.filter((h) => h !== firstUserMsg)].slice(0, 5));
      }
    }
    setMessages([]);
    setConversationHistory([]);
    setInput("");
  }

  async function sendMessage(userInput: string) {
    const userMsg = userInput.trim();
    if (!userMsg || isLoading) return;

    const newUser: Message = {
      id: uid(),
      role: "user",
      content: userMsg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUser]);
    setInput("");
    setIsLoading(true);

    try {
      const context = buildContext(selectedEntity);
      const { data, error } = await supabase.functions.invoke("ai-financial-assistant", {
        body: {
          system: SYSTEM_PROMPT,
          messages: [
            ...conversationHistory.slice(-6),
            {
              role: "user",
              content: `Financial data context:\n${context}\n\nQuestion: ${userMsg}`,
            },
          ],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const assistantMsg: string = data?.text ?? "";

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: assistantMsg, timestamp: new Date() },
      ]);
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: userMsg },
        { role: "assistant", content: assistantMsg },
      ]);
    } catch (e) {
      toast.error("Failed to get response. Please check your connection and try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleQuick(q: string) {
    setMobileOpen(false);
    sendMessage(q);
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(stripHtml(text));
    toast.success("Copied to clipboard");
  }

  function handleFeedback() {
    toast.success("Thank you for your feedback");
  }

  const showEmpty = useMemo(() => messages.length === 0 && !isLoading, [messages, isLoading]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 border-r flex-shrink-0 flex-col bg-background">
          <SidebarBody
            history={history}
            onNew={clearConversation}
            onQuick={handleQuick}
            onLoadHistory={(q) => sendMessage(q)}
            selectedEntity={selectedEntity}
            setSelectedEntity={setSelectedEntity}
          />
        </aside>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b px-6 py-3 flex items-center justify-between bg-background">
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SidebarBody
                    history={history}
                    onNew={() => {
                      clearConversation();
                      setMobileOpen(false);
                    }}
                    onQuick={handleQuick}
                    onLoadHistory={(q) => {
                      setMobileOpen(false);
                      sendMessage(q);
                    }}
                    selectedEntity={selectedEntity}
                    setSelectedEntity={setSelectedEntity}
                  />
                </SheetContent>
              </Sheet>
              <div className="leading-tight">
                <div className="font-medium text-sm">Future Link AI</div>
                <div className="text-xs text-muted-foreground">Powered by Claude</div>
              </div>
            </div>
            <Sparkles className="size-5 text-primary" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {showEmpty && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Sparkles className="size-10 text-primary mb-4" />
                <h2 className="text-lg font-medium">Ask me anything about your finances</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                  I have access to your journals, invoices, bills, tax filings, fraud alerts, and
                  reports across all entities.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-6 max-w-lg w-full">
                  {FEATURED.map((f) => {
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.title}
                        onClick={() => sendMessage(f.q)}
                        className="bg-background border rounded-xl p-4 hover:bg-muted/50 cursor-pointer transition text-left"
                      >
                        <Icon className="size-5 text-primary mb-2" />
                        <div className="text-[13px] font-medium">{f.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{f.q}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex flex-col items-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 max-w-[75%] text-sm whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatTime(m.timestamp)}
                  </span>
                </div>
              ) : (
                <div key={m.id} className="flex flex-col items-start max-w-full">
                  <Sparkles className="size-3.5 text-primary mb-1 ml-1" />
                  <div
                    className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%] text-sm break-words"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatTime(m.timestamp)}</span>
                    <span>·</span>
                    <button
                      onClick={() => handleCopy(renderMarkdown(m.content))}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                    <span>·</span>
                    <span>Was this helpful?</span>
                    <button
                      onClick={handleFeedback}
                      className="hover:text-foreground transition-colors"
                      aria-label="Helpful"
                    >
                      <ThumbsUp className="size-3" />
                    </button>
                    <button
                      onClick={handleFeedback}
                      className="hover:text-foreground transition-colors"
                      aria-label="Not helpful"
                    >
                      <ThumbsDown className="size-3" />
                    </button>
                  </div>
                </div>
              )
            )}

            {isLoading && (
              <div className="flex flex-col items-start">
                <Sparkles className="size-3.5 text-primary mb-1 ml-1" />
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground mt-1">AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 bg-background">
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask about revenue, expenses, invoices, tax, fraud alerts..."
                className="flex-1 border rounded-xl px-4 py-3 text-sm resize-none focus:border-primary focus:outline-none bg-background"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="bg-primary text-primary-foreground rounded-xl h-10 w-10 flex-shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}