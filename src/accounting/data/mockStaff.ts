export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export const MOCK_STAFF: StaffMember[] = [
  { id: 's1', name: 'Priya Sharma', role: 'Senior Counselor', email: 'priya@futurelink.com' },
  { id: 's2', name: 'Aman Verma', role: 'Visa Counselor', email: 'aman@futurelink.com' },
  { id: 's3', name: 'Rohit Mehra', role: 'Immigration Advisor', email: 'rohit@futurelink.com' },
  { id: 's4', name: 'Karan Iyer', role: 'Coaching Lead', email: 'karan@futurelink.com' },
  { id: 's5', name: 'Neha Kapoor', role: 'Counselor', email: 'neha@futurelink.com' },
  { id: 's6', name: 'Sandeep Rao', role: 'Senior Advisor', email: 'sandeep@futurelink.com' },
];

export const SERVICE_PACKAGES = [
  'Canada Study Visa Package',
  'Canada PR Express Entry',
  'Australia Study Visa',
  'UK Student Visa',
  'Germany Study Visa',
  'IELTS Coaching',
  'PTE Coaching',
  'TOEFL Coaching',
  'German A1 Language',
  'German A2 Language',
  'French DELF Coaching',
  'SOP Assistance',
  'PR Consultation',
  'Spouse Dependent Visa',
  'Family Reunification',
];

export const VISA_CATEGORIES = [
  'Student',
  'Work Permit',
  'PR — Express Entry',
  'PR — PNP',
  'Visitor',
  'Spouse / Dependent',
  'Business',
  'LMIA',
];

export const INTAKES = [
  'Spring 2025', 'Summer 2025', 'Fall 2025', 'Winter 2026',
  'Spring 2026', 'Summer 2026', 'Fall 2026',
];

export const LEAD_SOURCES = [
  'Website', 'Referral', 'Walk-in', 'Instagram', 'Facebook',
  'Google Ads', 'Education fair', 'Existing client', 'Partner',
];

export const CLIENT_TYPE_LABEL: Record<string, string> = {
  STUDENT: 'Student',
  IMMIGRATION: 'Immigration',
  CORPORATE: 'Corporate',
  FAMILY: 'Family',
  COACHING: 'Coaching',
  DEPENDENT: 'Dependent',
};