export type ApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AUDITOR1_REVIEW'
  | 'AUDITOR2_REVIEW'
  | 'FINAL_REVIEW'
  | 'OTP_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

export interface ApprovalStep {
  stepNumber: number;
  stepName: string;
  requiredRole: string;
  assignedTo: string;
  status: ApprovalStepStatus;
  actionAt?: string;
  comments?: string;
  ipAddress?: string;
  deviceHint?: string;
}

export interface PaymentRequest {
  id: string;
  requestNumber: string;
  entity: string;
  payeeName: string;
  amount: number;
  currency: 'CAD' | 'USD' | 'INR';
  description: string;
  dueDate?: string;
  status: ApprovalStatus;
  currentStep: number;
  submittedBy: string;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  linkedJournalId?: string;
  linkedDocumentId?: string;
  daysPending: number;
  steps: ApprovalStep[];
}

const STEP_TEMPLATES: { name: string; role: string; assignee: string }[] = [
  { name: 'Initial submission',  role: 'ACCOUNTANT',    assignee: 'Priya Sharma' },
  { name: 'Auditor 1 review',    role: 'AUDITOR',       assignee: 'James Whitfield' },
  { name: 'Auditor 2 review',    role: 'AUDITOR',       assignee: 'Meera Iyer' },
  { name: 'Final auditor review',role: 'FINAL_AUDITOR', assignee: 'Robert Chen' },
  { name: 'OTP verification',    role: 'FINAL_AUDITOR', assignee: 'Robert Chen' },
];

const IPS = ['10.0.14.22', '192.168.1.45', '172.16.5.88', '10.0.14.61', '192.168.2.10', '10.0.18.7'];
const DEVICES = ['MacBook Pro · Chrome', 'Windows · Edge', 'iPad · Safari', 'MacBook Air · Safari'];

function buildSteps(
  status: ApprovalStatus,
  currentStep: number,
  rejectionReason?: string,
  baseISO?: string,
): ApprovalStep[] {
  const baseDate = baseISO ? new Date(baseISO).getTime() : Date.now();
  return STEP_TEMPLATES.map((t, i) => {
    const stepNumber = i + 1;
    const tpl: ApprovalStep = {
      stepNumber,
      stepName: t.name,
      requiredRole: t.role,
      assignedTo: t.assignee,
      status: 'PENDING',
    };
    if (status === 'APPROVED') {
      tpl.status = 'APPROVED';
      tpl.actionAt = new Date(baseDate + i * 3600_000 * 6).toISOString();
      tpl.ipAddress = IPS[i % IPS.length];
      tpl.deviceHint = DEVICES[i % DEVICES.length];
      tpl.comments = i === 0
        ? 'Submitted with all backing documents.'
        : i === 4
        ? 'OTP verified successfully.'
        : 'Reviewed and approved.';
      return tpl;
    }
    if (status === 'REJECTED') {
      if (stepNumber < currentStep) {
        tpl.status = 'APPROVED';
        tpl.actionAt = new Date(baseDate + i * 3600_000 * 6).toISOString();
        tpl.ipAddress = IPS[i % IPS.length];
        tpl.deviceHint = DEVICES[i % DEVICES.length];
        tpl.comments = 'Reviewed and approved.';
      } else if (stepNumber === currentStep) {
        tpl.status = 'REJECTED';
        tpl.actionAt = new Date(baseDate + i * 3600_000 * 6).toISOString();
        tpl.ipAddress = IPS[i % IPS.length];
        tpl.deviceHint = DEVICES[i % DEVICES.length];
        tpl.comments = rejectionReason ?? 'Rejected by reviewer.';
      }
      return tpl;
    }
    if (status === 'CANCELLED') {
      if (stepNumber === 1) {
        tpl.status = 'APPROVED';
        tpl.actionAt = new Date(baseDate).toISOString();
        tpl.ipAddress = IPS[0];
        tpl.deviceHint = DEVICES[0];
        tpl.comments = 'Submitted then cancelled by submitter.';
      }
      return tpl;
    }
    // In-progress states
    if (stepNumber < currentStep) {
      tpl.status = 'APPROVED';
      tpl.actionAt = new Date(baseDate + i * 3600_000 * 6).toISOString();
      tpl.ipAddress = IPS[i % IPS.length];
      tpl.deviceHint = DEVICES[i % DEVICES.length];
      tpl.comments = i === 0 ? 'Submitted with backing invoice.' : 'Reviewed and approved.';
    }
    return tpl;
  });
}

interface Seed {
  payeeName: string;
  description: string;
  amount: number;
  currency: 'CAD' | 'USD' | 'INR';
  entity: string;
  status: ApprovalStatus;
  currentStep: number;
  submittedBy: string;
  daysPending: number;
  rejectionReason?: string;
  linkedJournalId?: string;
  linkedDocumentId?: string;
  dueDate?: string;
}

const SEEDS: Seed[] = [
  // 3 APPROVED
  { payeeName: 'Acme Supplies Ltd',     description: 'Office supplies October',         amount: 4280.55,  currency: 'CAD', entity: 'Canada HQ',     status: 'APPROVED',       currentStep: 5, submittedBy: 'Priya Sharma',  daysPending: 0, linkedJournalId: 'je3',  linkedDocumentId: 'd1', dueDate: '2024-11-05' },
  { payeeName: 'WeWork Toronto',        description: 'November coworking space',        amount: 6500.00,  currency: 'CAD', entity: 'Canada HQ',     status: 'APPROVED',       currentStep: 5, submittedBy: 'Priya Sharma',  daysPending: 0, linkedDocumentId: 'd4', dueDate: '2024-11-01' },
  { payeeName: 'Air Canada',            description: 'Client meeting flights — Mumbai', amount: 3120.40,  currency: 'CAD', entity: 'Canada HQ',     status: 'APPROVED',       currentStep: 5, submittedBy: 'James Whitfield',daysPending: 0, linkedJournalId: 'je7', dueDate: '2024-10-28' },

  // 2 REJECTED
  { payeeName: 'Bell Canada',           description: 'Disputed mobile bill — overage',  amount: 1842.10,  currency: 'CAD', entity: 'Canada HQ',     status: 'REJECTED',       currentStep: 2, submittedBy: 'Priya Sharma',  daysPending: 0, rejectionReason: 'Overage charges look incorrect — need vendor confirmation before paying.' },
  { payeeName: 'Zomato Catering',       description: 'Office lunch — Diwali event',     amount: 84500.00, currency: 'INR', entity: 'India Mumbai',  status: 'REJECTED',       currentStep: 3, submittedBy: 'Anita Reddy',   daysPending: 0, rejectionReason: 'Missing GST invoice — please resubmit with proper documentation.' },

  // 2 SUBMITTED
  { payeeName: 'Canada Revenue Agency', description: 'HST remittance Q3',               amount: 18250.00, currency: 'CAD', entity: 'Canada HQ',     status: 'SUBMITTED',      currentStep: 1, submittedBy: 'Priya Sharma',  daysPending: 0, linkedJournalId: 'je11', dueDate: '2024-11-15' },
  { payeeName: 'Shopify Plus',          description: 'Annual platform subscription',    amount: 2400.00,  currency: 'USD', entity: 'USA Corp',      status: 'SUBMITTED',      currentStep: 1, submittedBy: 'Daniel Park',   daysPending: 1, linkedDocumentId: 'd6', dueDate: '2024-11-12' },

  // 2 AUDITOR1_REVIEW
  { payeeName: 'Toronto Hydro',         description: 'Office electricity — October',    amount: 1240.65,  currency: 'CAD', entity: 'Canada HQ',     status: 'AUDITOR1_REVIEW',currentStep: 2, submittedBy: 'Priya Sharma',  daysPending: 1, dueDate: '2024-11-08' },
  { payeeName: 'Adobe Inc',             description: 'Creative Cloud team licenses',    amount: 4860.00,  currency: 'USD', entity: 'USA Corp',      status: 'AUDITOR1_REVIEW',currentStep: 2, submittedBy: 'Daniel Park',   daysPending: 3, linkedDocumentId: 'd8' },

  // 2 AUDITOR2_REVIEW
  { payeeName: 'HDFC Bank',             description: 'Loan EMI November',               amount: 285000.00,currency: 'INR', entity: 'India Mumbai',  status: 'AUDITOR2_REVIEW',currentStep: 3, submittedBy: 'Anita Reddy',   daysPending: 2, linkedDocumentId: 'd5', dueDate: '2024-11-10' },
  { payeeName: 'Stripe',                description: 'Payment processing fees October', amount: 1842.30,  currency: 'USD', entity: 'USA Corp',      status: 'AUDITOR2_REVIEW',currentStep: 3, submittedBy: 'Daniel Park',   daysPending: 4 },

  // 2 FINAL_REVIEW
  { payeeName: 'TechPro Consulting',    description: 'Q4 advisory retainer',            amount: 12500.00, currency: 'CAD', entity: 'Canada HQ',     status: 'FINAL_REVIEW',   currentStep: 4, submittedBy: 'Priya Sharma',  daysPending: 5, linkedJournalId: 'je14', dueDate: '2024-11-04' },
  { payeeName: 'JetBrains s.r.o.',      description: 'IDE renewals — engineering team', amount: 3940.00,  currency: 'USD', entity: 'USA Corp',      status: 'FINAL_REVIEW',   currentStep: 4, submittedBy: 'Daniel Park',   daysPending: 6 },

  // 1 OTP_PENDING
  { payeeName: 'Payroll Canada',        description: 'October salary run CAD 142,000',  amount: 142000.00,currency: 'CAD', entity: 'Canada HQ',     status: 'OTP_PENDING',    currentStep: 5, submittedBy: 'Priya Sharma',  daysPending: 1, dueDate: '2024-11-01' },

  // 1 CANCELLED
  { payeeName: 'OfficeMax',             description: 'Bulk stationery — duplicate PO',  amount: 985.40,   currency: 'CAD', entity: 'Canada HQ',     status: 'CANCELLED',      currentStep: 1, submittedBy: 'Priya Sharma',  daysPending: 0 },
];

function isoDaysAgo(days: number, hourOffset = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hourOffset, 12, 0, 0);
  return d.toISOString();
}

export const MOCK_APPROVALS: PaymentRequest[] = [];
