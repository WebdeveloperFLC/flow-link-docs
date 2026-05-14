import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ChevronLeft, Check, X, Clock, FileText, Link2, Shield, AlertTriangle, Inbox,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import { formatCurrency } from "../../lib/format";
import {
  MOCK_APPROVALS, PaymentRequest, ApprovalStatus, ApprovalStep,
} from "../../data/mockApprovals";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<ApprovalStatus, { label: string; cls: string }> = {
  DRAFT:           { label: 'Draft',            cls: 'bg-muted text-muted-foreground' },
  SUBMITTED:       { label: 'Submitted',        cls: 'bg-muted text-muted-foreground' },
  AUDITOR1_REVIEW: { label: 'Auditor 1 review', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  AUDITOR2_REVIEW: { label: 'Auditor 2 review', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  FINAL_REVIEW:    { label: 'Final review',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
  OTP_PENDING:     { label: 'OTP pending',      cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300' },
  APPROVED:        { label: 'Approved',         cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' },
  REJECTED:        { label: 'Rejected',         cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  CANCELLED:       { label: 'Cancelled',        cls: 'bg-muted text-muted-foreground' },
};

const NEXT_STAGE: Partial<Record<ApprovalStatus, ApprovalStatus>> = {
  AUDITOR1_REVIEW: 'AUDITOR2_REVIEW',
  AUDITOR2_REVIEW: 'FINAL_REVIEW',
  FINAL_REVIEW: 'OTP_PENDING',
};

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SHAKE_STYLE = `
@keyframes otp-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.otp-shake { animation: otp-shake 0.4s ease-in-out; }
`;

export default function AccountingApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const initial = useMemo(() => MOCK_APPROVALS.find(r => r.id === id), [id]);
  const [request, setRequest] = useState<PaymentRequest | undefined>(initial);

  useEffect(() => { setRequest(initial); }, [initial]);

  if (!request) {
    return (
      <AppLayout>
        <div className="p-8">
          <AccountingEmptyState
            icon={Inbox}
            title="Request not found"
            description="This payment request may have been removed."
            action={<Button variant="outline" onClick={() => navigate('/accounting/approvals')}><ChevronLeft className="h-4 w-4" /> Back to queue</Button>}
          />
        </div>
      </AppLayout>
    );
  }

  const pill = STATUS_PILL[request.status];
  const isAuditorStage = request.status === 'AUDITOR1_REVIEW' || request.status === 'AUDITOR2_REVIEW';
  const isFinalStage = request.status === 'FINAL_REVIEW';
  const isOtpStage = request.status === 'OTP_PENDING';
  const requiresAction = isAuditorStage || isFinalStage || isOtpStage;
  const currentStepObj = request.steps.find(s => s.stepNumber === request.currentStep);

  const advance = () => {
    const next = NEXT_STAGE[request.status];
    if (!next) return;
    setRequest(prev => prev && ({
      ...prev,
      status: next,
      currentStep: prev.currentStep + 1,
      steps: prev.steps.map(s => s.stepNumber === prev.currentStep
        ? { ...s, status: 'APPROVED', actionAt: new Date().toISOString(), ipAddress: '10.0.14.22', deviceHint: 'MacBook Pro · Chrome', comments: comments.trim() || s.comments || 'Reviewed and approved.' }
        : s),
    }));
    setComments('');
    toast.success(`Step approved — forwarded to ${STATUS_PILL[next].label}`);
  };

  const finalApprove = () => advance();

  const reject = (reason: string) => {
    setRequest(prev => prev && ({
      ...prev,
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      steps: prev.steps.map(s => s.stepNumber === prev.currentStep
        ? { ...s, status: 'REJECTED', actionAt: new Date().toISOString(), ipAddress: '10.0.14.22', deviceHint: 'MacBook Pro · Chrome', comments: reason }
        : s),
    }));
    setComments('');
    toast.success('Request rejected and returned');
  };

  const completeOtp = () => {
    setRequest(prev => prev && ({
      ...prev,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      steps: prev.steps.map(s => s.stepNumber === prev.currentStep
        ? { ...s, status: 'APPROVED', actionAt: new Date().toISOString(), ipAddress: '10.0.14.22', deviceHint: 'MacBook Pro · Chrome', comments: 'OTP verified successfully.' }
        : s),
    }));
    toast.success('Payment request approved!');
    setTimeout(() => navigate('/accounting/approvals'), 600);
  };

  // Action panel state
  const [comments, setComments] = useState('');
  const [commentsError, setCommentsError] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  const handleApproveClick = () => setConfirmApprove(true);
  const handleRejectClick = () => {
    if (!comments.trim()) {
      setCommentsError('Please add a reason for rejection.');
      return;
    }
    setCommentsError('');
    setConfirmReject(true);
  };

  return (
    <AppLayout>
      <style>{SHAKE_STYLE}</style>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="px-8 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              <Link to="/accounting/approvals" className="hover:underline">Approvals</Link>
              <span className="mx-1.5">/</span>
              <span>{request.requestNumber}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-semibold tracking-tight">{request.requestNumber}</h1>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", pill.cls)}>{pill.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/accounting/approvals')}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {isAuditorStage && (
              <>
                <Button size="sm" variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10" onClick={handleApproveClick}>
                  <Check className="h-4 w-4" /> Approve step
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleRejectClick}>
                  <X className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {isFinalStage && (
              <>
                <Button size="sm" variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10" onClick={handleApproveClick}>
                  <Check className="h-4 w-4" /> Final approve
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleRejectClick}>
                  <X className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {isOtpStage && (
              <Button size="sm">
                <Shield className="h-4 w-4" /> Enter OTP below
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <AccountingPageHeader
          title={request.payeeName}
          subtitle={`${request.entity} · Submitted ${fmtDateTime(request.submittedAt)}`}
        />

        {/* Card 1 — Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Request summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <Field label="Request number" value={<span className="font-mono">{request.requestNumber}</span>} />
              <Field label="Entity" value={request.entity} />
              <Field label="Payee name" value={request.payeeName} />
              <Field label="Amount" value={<span className="text-lg font-semibold tabular-nums">{formatCurrency(request.amount, request.currency)}</span>} />
              <Field label="Description" value={request.description} />
              <Field label="Due date" value={fmtDate(request.dueDate)} />
              <Field label="Submitted by" value={request.submittedBy} />
              <Field label="Submitted at" value={fmtDateTime(request.submittedAt)} />
              <Field
                label="Linked journal"
                value={request.linkedJournalId
                  ? <Link to={`/accounting/journals/${request.linkedJournalId}`} className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"><Link2 className="h-3 w-3" />{request.linkedJournalId}</Link>
                  : <span className="text-muted-foreground">—</span>}
              />
              <Field
                label="Linked document"
                value={request.linkedDocumentId
                  ? <Link to={`/accounting/documents`} className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"><FileText className="h-3 w-3" />{request.linkedDocumentId}</Link>
                  : <span className="text-muted-foreground">—</span>}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Approval timeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Approval progress</CardTitle></CardHeader>
          <CardContent>
            <StepTracker request={request} />
            <div className="space-y-3 mt-6">
              {request.steps.map(s => (
                <StepRow key={s.stepNumber} step={s} isCurrent={s.stepNumber === request.currentStep && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status)} requestStatus={request.status} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Action panel */}
        {requiresAction && (
          <div className="bg-muted/30 border rounded-xl p-5">
            {(isAuditorStage || isFinalStage) && (
              <>
                <div className="mb-4">
                  <h3 className="text-base font-semibold">Your action required — {currentStepObj?.stepName}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Review the payment request details above and approve or reject.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments {isAuditorStage || isFinalStage ? <span className="text-muted-foreground font-normal">(required for rejection)</span> : null}</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={e => { setComments(e.target.value); if (e.target.value.trim()) setCommentsError(''); }}
                    placeholder="Add review comments (required for rejection)…"
                    rows={3}
                  />
                  {commentsError && <p className="text-xs text-destructive">{commentsError}</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleApproveClick}
                  >
                    <Check className="h-4 w-4" />
                    {isFinalStage ? 'Final approve — proceed to OTP verification' : 'Approve & forward to next step'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleRejectClick}
                  >
                    <X className="h-4 w-4" />
                    {isFinalStage ? 'Reject request' : 'Reject & return to submitter'}
                  </Button>
                </div>
              </>
            )}
            {isOtpStage && <OtpPanel onVerified={completeOtp} onCancel={() => navigate('/accounting/approvals')} />}
          </div>
        )}

        {/* Card 4 — Audit trail */}
        <Card>
          <CardHeader><CardTitle className="text-base">Full audit trail</CardTitle></CardHeader>
          <CardContent>
            <AuditTrail request={request} />
          </CardContent>
        </Card>
      </div>

      {/* Confirm approve */}
      <AlertDialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isFinalStage ? 'Final approve payment request?' : 'Approve payment request?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isFinalStage
                ? `This will forward ${request.requestNumber} to OTP verification.`
                : `This will forward ${request.requestNumber} to the next approval step.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { isFinalStage ? finalApprove() : advance(); setConfirmApprove(false); }}>
              {isFinalStage ? 'Final approve' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm reject */}
      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject payment request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will return the request to {request.submittedBy} with your comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { reject(comments.trim()); setConfirmReject(false); }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}

function StepTracker({ request }: { request: PaymentRequest }) {
  return (
    <div className="flex items-center">
      {request.steps.map((s, i) => {
        const isLast = i === request.steps.length - 1;
        const isCurrent = s.stepNumber === request.currentStep && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status);
        const isApproved = s.status === 'APPROVED';
        const isRejected = s.status === 'REJECTED';
        return (
          <div key={s.stepNumber} className={cn("flex items-center", isLast ? "" : "flex-1")}>
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium relative",
                isApproved && "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
                isRejected && "bg-destructive/10 text-destructive",
                isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse",
                !isApproved && !isRejected && !isCurrent && "bg-muted text-muted-foreground",
              )}>
                {isApproved ? <Check className="h-4 w-4" /> : isRejected ? <X className="h-4 w-4" /> : s.stepNumber}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5 whitespace-nowrap">Step {s.stepNumber}</div>
            </div>
            {!isLast && (
              <div className={cn("flex-1 h-0.5 mx-2 -mt-4", isApproved ? "bg-green-300 dark:bg-green-500/40" : "bg-muted")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepRow({ step, isCurrent, requestStatus }: { step: ApprovalStep; isCurrent: boolean; requestStatus: ApprovalStatus }) {
  const isApproved = step.status === 'APPROVED';
  const isRejected = step.status === 'REJECTED';
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0",
        isApproved && "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
        isRejected && "bg-destructive/10 text-destructive",
        isCurrent && "bg-primary text-primary-foreground",
        !isApproved && !isRejected && !isCurrent && "bg-muted text-muted-foreground",
      )}>
        {isApproved ? <Check className="h-3 w-3" /> : isRejected ? <X className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{step.stepName}</span>
          <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{step.requiredRole}</span>
        </div>
        {(isApproved || isRejected) && (
          <div className="text-sm text-muted-foreground mt-1">{step.assignedTo}</div>
        )}
        {step.comments && (
          <div className="italic text-sm text-muted-foreground bg-muted/50 rounded p-2 mt-2">"{step.comments}"</div>
        )}
        {isCurrent && (
          <div className="text-sm text-muted-foreground mt-1">Awaiting review by {step.requiredRole}</div>
        )}
        {!isApproved && !isRejected && !isCurrent && (
          <div className="text-xs text-muted-foreground mt-1">Not yet reached</div>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {step.actionAt && <div className="text-xs text-muted-foreground">{fmtDateTime(step.actionAt)}</div>}
        {step.ipAddress && <div className="text-[11px] text-muted-foreground/60 mt-0.5">{step.ipAddress}</div>}
        {isCurrent && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Pending</span>
        )}
      </div>
    </div>
  );
}

function AuditTrail({ request }: { request: PaymentRequest }) {
  const events: { dot: string; label: string; at?: string; ip?: string; comments?: string }[] = [];
  events.push({ dot: 'bg-blue-500', label: `Request submitted by ${request.submittedBy}`, at: request.submittedAt, ip: request.steps[0]?.ipAddress });
  request.steps.forEach(s => {
    if (s.status === 'APPROVED' && s.stepNumber > 1) {
      events.push({ dot: 'bg-green-500', label: `${s.stepName} — approved by ${s.assignedTo}`, at: s.actionAt, ip: s.ipAddress, comments: s.comments });
    }
    if (s.status === 'REJECTED') {
      events.push({ dot: 'bg-destructive', label: `${s.stepName} — rejected by ${s.assignedTo}`, at: s.actionAt, ip: s.ipAddress, comments: s.comments });
    }
  });
  if (request.status === 'APPROVED' && request.approvedAt) {
    events.push({ dot: 'bg-green-600', label: 'Payment request fully approved', at: request.approvedAt });
  }
  if (request.status === 'CANCELLED') {
    events.push({ dot: 'bg-muted-foreground', label: 'Request cancelled by submitter', at: request.submittedAt });
  }
  return (
    <div className="space-y-4">
      {events.map((e, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <div className={cn("w-2.5 h-2.5 rounded-full", e.dot)} />
            {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 pb-2">
            <div className="text-sm">{e.label}</div>
            <div className="text-xs text-muted-foreground">{fmtDateTime(e.at)}{e.ip && <span className="ml-2">· {e.ip}</span>}</div>
            {e.comments && <div className="italic text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1.5">"{e.comments}"</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function OtpPanel({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const verify = (code: string) => {
    if (code === '123456') {
      onVerified();
    } else {
      setError('Invalid code. Try again.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    }
  };

  const handleChange = (i: number, v: string) => {
    const ch = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    setError('');
    if (ch && i < 5) refs.current[i + 1]?.focus();
    if (ch && i === 5) {
      const code = next.join('');
      if (code.length === 6) setTimeout(() => verify(code), 100);
    }
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      setDigits(text.split(''));
      setTimeout(() => verify(text), 100);
    }
  };

  return (
    <>
      <div className="mb-4">
        <h3 className="text-base font-semibold">OTP verification required</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter your secure 6-digit approval code to complete this payment request. This is the final authorisation step.
        </p>
        <p className="text-xs text-muted-foreground mt-2">Hint for demo: code is <span className="font-mono font-semibold">123456</span>.</p>
      </div>
      <div className={cn("flex gap-2 justify-center mb-2", shake && "otp-shake")}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => (refs.current[i] = el)}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            onPaste={handlePaste}
            inputMode="numeric"
            maxLength={1}
            className={cn(
              "w-12 h-14 text-center text-xl font-mono border rounded-lg bg-background outline-none transition-colors",
              error ? "border-destructive" : "border-input focus:border-primary",
            )}
          />
        ))}
      </div>
      {error && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-destructive mb-2">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </div>
      )}
      <div className="flex gap-3 mt-4">
        <Button className="flex-1" onClick={() => verify(digits.join(''))} disabled={digits.some(d => !d)}>
          <Shield className="h-4 w-4" /> Verify & approve
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </>
  );
}
