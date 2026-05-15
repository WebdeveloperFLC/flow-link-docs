import { ComplianceNotice } from "../types/tax";

export const MOCK_NOTICES: ComplianceNotice[] = [
  {
    id: "n-1", entityId: "e1", entityName: "Future Link Canada HQ",
    authority: "Canada Revenue Agency", noticeNumber: "CRA-2025-04821",
    issueDate: "2025-09-12", dueDate: "2025-10-12",
    amount: 4280, currency: "CAD", status: "OPEN",
    linkedDocument: "CRA_GST_review_Q2.pdf",
    notes: "Request for supporting invoices for input tax credits in Q2.",
  },
  {
    id: "n-2", entityId: "e3", entityName: "Future Link India Pvt Ltd",
    authority: "Income Tax Department, India", noticeNumber: "143(1)/2024-25",
    issueDate: "2025-08-22", dueDate: "2025-09-22",
    amount: 18420, currency: "INR", status: "RESPONDED",
    linkedDocument: "ITR_Response_FY24.pdf",
  },
  {
    id: "n-3", entityId: "e2", entityName: "Future Link USA Corp",
    authority: "California Department of Tax & Fee Admin", noticeNumber: "CDTFA-77293",
    issueDate: "2025-07-04", dueDate: "2025-08-04",
    amount: 1240, currency: "USD", status: "CLOSED",
  },
];