import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, Clock, CheckCircle2, AlertTriangle, Inbox } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import { formatCurrency } from "../../lib/format";
import { MOCK_APPROVALS, PaymentRequest, ApprovalStatus } from "../../data/mockApprovals";
import { cn } from "@/lib/utils";

const TERMINAL: ApprovalStatus[] = ['APPROVED', 'REJECTED', 'CANCELLED'];

const STATUS_PILL: Record<ApprovalStatus, { label: string; cls: string }> = {
  DRAFT:            { label: 'Draft',            cls: 'bg-muted text-muted-foreground' },
  SUBMITTED:        { label: 'Submitted',        cls: 'bg-muted text-muted-foreground' },
  AUDITOR1_REVIEW:  { label: 'Auditor 1 review', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  AUDITOR2_REVIEW:  { label: 'Auditor 2 review', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  FINAL_REVIEW:     { label: 'Final review',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
  OTP_PENDING:      { label: 'OTP pending',      cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300' },
  APPROVED:         { label: 'Approved',         cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' },
  REJECTED:         { label: 'Rejected',         cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  CANCELLED:        { label: 'Cancelled',        cls: 'bg-muted text-muted-foreground' },
};

const NEXT_STAGE: Partial<Record<ApprovalStatus, ApprovalStatus>> = {
  SUBMITTED: 'AUDITOR1_REVIEW',
  AUDITOR1_REVIEW: 'AUDITOR2_REVIEW',
  AUDITOR2_REVIEW: 'FINAL_REVIEW',
  FINAL_REVIEW: 'OTP_PENDING',
  OTP_PENDING: 'APPROVED',
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AccountingApprovalsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PaymentRequest[]>(MOCK_APPROVALS);
  const [tab, setTab] = useState<'all' | 'pending' | 'me' | 'completed'>('all');

  const [approveTarget, setApproveTarget] = useState<PaymentRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<PaymentRequest | null>(null);

  const stats = useMemo(() => {
    const pending = requests.filter(r => !TERMINAL.includes(r.status)).length;
    const me = requests.filter(r => r.currentStep === 2 || r.currentStep === 3).filter(r => !TERMINAL.includes(r.status)).length;
    const overdue = requests.filter(r => r.daysPending > 2 && !TERMINAL.includes(r.status)).length;
    const approvedThisMonth = requests.filter(r => r.status === 'APPROVED').length;
    return { pending, me, overdue, approvedThisMonth };
  }, [requests]);

  const filteredByTab = useMemo(() => {
    switch (tab) {
      case 'pending':   return requests.filter(r => !TERMINAL.includes(r.status));
      case 'me':        return requests.filter(r => r.status === 'AUDITOR1_REVIEW' || r.status === 'AUDITOR2_REVIEW');
      case 'completed': return requests.filter(r => TERMINAL.includes(r.status));
      default:          return requests;
    }
  }, [requests, tab]);

  const advance = (target: PaymentRequest) => {
    const next = NEXT_STAGE[target.status];
    if (!next) return;
    setRequests(prev => prev.map(r => {
      if (r.id !== target.id) return r;
      const newSteps = r.steps.map(s => s.stepNumber === r.currentStep
        ? { ...s, status: 'APPROVED' as const, actionAt: new Date().toISOString(), ipAddress: '10.0.14.22', deviceHint: 'MacBook Pro · Chrome', comments: s.comments ?? 'Reviewed and approved.' }
        : s);
      return { ...r, status: next, currentStep: r.currentStep + 1, steps: newSteps };
    }));
    toast.success(`Approved — forwarded to ${STATUS_PILL[next].label}`);
  };

  const reject = (target: PaymentRequest, reason: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== target.id) return r;
      const newSteps = r.steps.map(s => s.stepNumber === r.currentStep
        ? { ...s, status: 'REJECTED' as const, actionAt: new Date().toISOString(), ipAddress: '10.0.14.22', deviceHint: 'MacBook Pro · Chrome', comments: reason }
        : s);
      return { ...r, status: 'REJECTED' as const, rejectedAt: new Date().toISOString(), rejectionReason: reason, steps: newSteps };
    }));
    toast.success('Request rejected and returned to submitter');
  };

  const cancel = (target: PaymentRequest) => {
    setRequests(prev => prev.map(r => r.id === target.id ? { ...r, status: 'CANCELLED' as const } : r));
    toast.success('Request cancelled');
  };

  const renderTable = (rows: PaymentRequest[]) => (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-4 py-2.5 w-32">Request #</th>
            <th className="text-left font-medium px-4 py-2.5">Description</th>
            <th className="text-left font-medium px-4 py-2.5 w-36">Payee</th>
            <th className="text-right font-medium px-4 py-2.5 w-28">Amount</th>
            <th className="text-left font-medium px-4 py-2.5 w-28">Entity</th>
            <th className="text-left font-medium px-4 py-2.5 w-28">Submitted</th>
            <th className="text-left font-medium px-4 py-2.5 w-40">Current step</th>
            <th className="text-left font-medium px-4 py-2.5 w-20">Days</th>
            <th className="px-2 py-2.5 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">No requests in this view.</td></tr>
          )}
          {rows.map(r => {
            const pill = STATUS_PILL[r.status];
            const overdue = r.daysPending > 2 && !TERMINAL.includes(r.status);
            const canAct = r.status === 'AUDITOR1_REVIEW' || r.status === 'AUDITOR2_REVIEW';
            return (
              <tr
                key={r.id}
                className="border-t hover:bg-muted/30 cursor-pointer"
                onClick={() => navigate(`/accounting/approvals/${r.id}`)}
              >
                <td className="px-4 py-2.5">
                  <span className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs">{r.requestNumber}</span>
                </td>
                <td className="px-4 py-2.5 truncate max-w-0">{r.description}</td>
                <td className="px-4 py-2.5 truncate">{r.payeeName}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(r.amount, r.currency)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.entity}</td>
                <td className="px-4 py-2.5">
                  <div className="text-xs">{r.submittedBy}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtDateTime(r.submittedAt)}</div>
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", pill.cls)}>{pill.label}</span>
                </td>
                <td className={cn("px-4 py-2.5 text-sm", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                  {r.daysPending}d
                </td>
                <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/accounting/approvals/${r.id}`)}>View details</DropdownMenuItem>
                      {canAct && (
                        <>
                          <DropdownMenuItem onClick={() => setApproveTarget(r)}>Approve</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { setRejectTarget(r); setRejectReason(''); setRejectError(''); }}>Reject</DropdownMenuItem>
                        </>
                      )}
                      {r.status === 'SUBMITTED' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setCancelTarget(r)}>Cancel request</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Approval queue"
          subtitle="Accounting · Future Link Flow"
          actions={
            <Button onClick={() => navigate('/accounting/ap')}>
              <Plus className="h-4 w-4" /> New payment request
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <AccountingKPICard label="Pending approvals"   value={String(stats.pending)}   icon={Clock} />
          <AccountingKPICard label="Awaiting my action"  value={String(stats.me)}        icon={Inbox} />
          <AccountingKPICard label="Overdue (>48h)"      value={String(stats.overdue)}   icon={AlertTriangle} />
          <AccountingKPICard label="Approved this month" value={String(stats.approvedThisMonth)} icon={CheckCircle2} />
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({requests.filter(r => !TERMINAL.includes(r.status)).length})</TabsTrigger>
            <TabsTrigger value="me">Awaiting me ({requests.filter(r => r.status === 'AUDITOR1_REVIEW' || r.status === 'AUDITOR2_REVIEW').length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({requests.filter(r => TERMINAL.includes(r.status)).length})</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-0">{renderTable(filteredByTab)}</TabsContent>
        </Tabs>
      </div>

      {/* Approve dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={o => !o && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve payment request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will forward {approveTarget?.requestNumber} to the next approval step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (approveTarget) advance(approveTarget); setApproveTarget(null); }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={o => !o && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject payment request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will return {rejectTarget?.requestNumber} to {rejectTarget?.submittedBy} with your comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason for rejection<span className="text-destructive"> *</span></Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={e => { setRejectReason(e.target.value); if (e.target.value.trim()) setRejectError(''); }}
              placeholder="Explain why this is being rejected…"
              rows={3}
            />
            {rejectError && <p className="text-xs text-destructive">{rejectError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                if (!rejectReason.trim()) {
                  e.preventDefault();
                  setRejectError('Please add a reason for rejection.');
                  return;
                }
                if (rejectTarget) reject(rejectTarget, rejectReason.trim());
                setRejectTarget(null);
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={o => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget?.requestNumber} will be marked as cancelled. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep request</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (cancelTarget) cancel(cancelTarget); setCancelTarget(null); }}>Cancel request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
