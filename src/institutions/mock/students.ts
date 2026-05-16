import type { MockStudent, MockPayment } from "./types";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const mockStudents: MockStudent[] = [
  // Seneca — Fall 2025 cycle (cc-2)
  { id: "stu-1", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-2", full_name: "Aarav Sharma", country: "India", intake_original: "Sep 2025", intake_processed: "Sep 2025", program: "PG Diploma — Project Management", tuition: 18000, currency: "CAD", status: "eligible" },
  { id: "stu-2", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-2", full_name: "Priya Patel", country: "India", intake_original: "Sep 2025", intake_processed: "Sep 2025", program: "PG Diploma — Business Analytics", tuition: 19500, currency: "CAD", status: "eligible" },
  { id: "stu-3", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-2", full_name: "Chidi Okafor", country: "Nigeria", intake_original: "Sep 2025", intake_processed: "Sep 2025", program: "Bachelor of Tech", tuition: 21000, currency: "CAD", status: "pending_dues", block_reason: "Tuition partial — second installment pending" },
  { id: "stu-4", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-2", full_name: "Maria Garcia", country: "Philippines", intake_original: "Sep 2025", intake_processed: "Sep 2025", program: "PG Diploma — UX", tuition: 17500, currency: "CAD", status: "missing_consent", block_reason: "No commission consent on file" },
  { id: "stu-5", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-2", full_name: "Long Nguyen", country: "Vietnam", intake_original: "Sep 2025", intake_processed: "Jan 2026", program: "Cybersecurity", tuition: 22000, currency: "CAD", status: "deferred", block_reason: "Deferred to Jan 2026" },

  // Seneca — Winter 2026 cycle (cc-1) including the carry-forward of stu-5
  { id: "stu-6", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-1", full_name: "Long Nguyen", country: "Vietnam", intake_original: "Sep 2025", intake_processed: "Jan 2026", program: "Cybersecurity", tuition: 22000, currency: "CAD", status: "carried_forward", carry_forward_from: "stu-5" },
  { id: "stu-7", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-1", full_name: "Sara Khan", country: "Pakistan", intake_original: "Jan 2026", intake_processed: "Jan 2026", program: "PG Diploma — Cloud", tuition: 20000, currency: "CAD", status: "eligible" },
  { id: "stu-8", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-1", full_name: "Tom Yeboah", country: "Ghana", intake_original: "Jan 2026", intake_processed: "Jan 2026", program: "PG Diploma — Data", tuition: 19800, currency: "CAD", status: "withdrawn", block_reason: "Withdrew week 2" },

  // Conestoga — Winter 2026 (cc-3)
  { id: "stu-9", institution_id: "mock-inst-conestoga", claim_cycle_id: "cc-3", full_name: "Rahul Mehta", country: "India", intake_original: "Jan 2026", intake_processed: "Jan 2026", program: "Mechanical Engineering Tech", tuition: 16000, currency: "CAD", status: "eligible" },
  { id: "stu-10", institution_id: "mock-inst-conestoga", claim_cycle_id: "cc-3", full_name: "Anjali Nair", country: "India", intake_original: "Jan 2026", intake_processed: "Jan 2026", program: "Business Admin", tuition: 16000, currency: "CAD", status: "eligible" },
  { id: "stu-11", institution_id: "mock-inst-conestoga", claim_cycle_id: "cc-3", full_name: "Vikram Singh", country: "India", intake_original: "Jan 2026", intake_processed: "Jan 2026", program: "Supply Chain", tuition: 16000, currency: "CAD", status: "missing_consent", block_reason: "Consent form pending signature" },

  // Centennial — Fall 2025 (cc-4)
  { id: "stu-12", institution_id: "mock-inst-centennial", claim_cycle_id: "cc-4", full_name: "Fatima Rahman", country: "Bangladesh", intake_original: "Sep 2025", intake_processed: "Sep 2025", program: "Software Engineering", tuition: 18500, currency: "CAD", status: "eligible" },
  { id: "stu-13", institution_id: "mock-inst-centennial", claim_cycle_id: "cc-4", full_name: "Karan Verma", country: "India", intake_original: "Sep 2025", intake_processed: "Sep 2025", program: "Hospitality", tuition: 17500, currency: "CAD", status: "eligible" },

  // Fanshawe — Winter 2025 (cc-5)
  { id: "stu-14", institution_id: "mock-inst-fanshawe", claim_cycle_id: "cc-5", full_name: "Joseph Mensah", country: "Ghana", intake_original: "Jan 2025", intake_processed: "Jan 2025", program: "IT Infrastructure", tuition: 15000, currency: "CAD", status: "pending_dues", block_reason: "Disputed enrollment record" },
];

export const mockPayments: MockPayment[] = [
  { id: "pay-1", invoice_id: "inv-1", amount: 92000, currency: "CAD", paid_at: "2025-12-22T00:00:00Z", method: "wire", proof_path: "mock/proofs/inv-1.pdf" },
  { id: "pay-2", invoice_id: "inv-4", amount: 8000, currency: "CAD", paid_at: "2025-05-10T00:00:00Z", method: "wire", proof_path: "mock/proofs/inv-4.pdf" },
];

// Avoid unused-var warning for `today/iso` if not used by future entries
void today;
void iso;