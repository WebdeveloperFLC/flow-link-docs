export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export const MOCK_STAFF: StaffMember[] = [];

export const SERVICE_PACKAGES = [];

export const VISA_CATEGORIES = [];

export const INTAKES = [];

export const LEAD_SOURCES = [];

export const CLIENT_TYPE_LABEL: Record<string, string> = {
  STUDENT: 'Student',
  IMMIGRATION: 'Immigration',
  CORPORATE: 'Corporate',
  FAMILY: 'Family',
  COACHING: 'Coaching',
  DEPENDENT: 'Dependent',
};