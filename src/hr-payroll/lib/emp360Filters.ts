import type {
  BranchRow,
  CompanyRow,
  DepartmentRow,
  DesignationRow,
  EmployeeRow,
} from "./types";
import { payrollCompanyLabel } from "./format";

export const EMP360_COUNTRY_OPTIONS = [
  { value: "All", label: "All countries" },
  { value: "IN", label: "India" },
  { value: "CA", label: "Canada" },
] as const;

export type Emp360Filters = {
  country: string;
  branch: string;
  company: string;
  department: string;
  designation: string;
  employment: string;
  search: string;
};

export const EMP360_FILTER_KEYS = [
  "country",
  "branch",
  "company",
  "department",
  "designation",
  "employment",
  "q",
] as const;

export function defaultEmp360Filters(): Emp360Filters {
  return {
    country: "All",
    branch: "All",
    company: "All",
    department: "All",
    designation: "All",
    employment: "All",
    search: "",
  };
}

export function employmentTypeLabel(emp: EmployeeRow) {
  return emp.employment_type?.trim() || emp.hr_employee_categories?.label || "—";
}

export function emp360FiltersFromSearchParams(params: URLSearchParams): Emp360Filters {
  const d = defaultEmp360Filters();
  const country = params.get("country");
  const branch = params.get("branch");
  const company = params.get("company");
  const department = params.get("department");
  const designation = params.get("designation");
  const employment = params.get("employment");
  const q = params.get("q");
  if (country) d.country = country;
  if (branch) d.branch = branch;
  if (company) d.company = company;
  if (department) d.department = department;
  if (designation) d.designation = designation;
  if (employment) d.employment = employment;
  if (q) d.search = q;
  return d;
}

export function emp360FiltersToSearchParams(filters: Emp360Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.country !== "All") p.set("country", filters.country);
  if (filters.branch !== "All") p.set("branch", filters.branch);
  if (filters.company !== "All") p.set("company", filters.company);
  if (filters.department !== "All") p.set("department", filters.department);
  if (filters.designation !== "All") p.set("designation", filters.designation);
  if (filters.employment !== "All") p.set("employment", filters.employment);
  if (filters.search.trim()) p.set("q", filters.search.trim());
  return p;
}

export function collectEmploymentTypes(employees: EmployeeRow[]) {
  const set = new Set<string>();
  for (const e of employees) {
    const label = employmentTypeLabel(e);
    if (label && label !== "—") set.add(label);
  }
  return [...set].sort();
}

export type Emp360FilterOption = { id: string; label: string };

export type Emp360FilterOptions = {
  branches: Emp360FilterOption[];
  companies: Emp360FilterOption[];
  departments: Emp360FilterOption[];
  designations: Emp360FilterOption[];
};

/** Merge CRM reference masters with values present on loaded employees. */
export function collectEmp360FilterOptions(
  employees: EmployeeRow[],
  ref?: {
    branches?: BranchRow[];
    companies?: CompanyRow[];
    departments?: DepartmentRow[];
    designations?: DesignationRow[];
  },
): Emp360FilterOptions {
  const branches = new Map<string, string>();
  const companies = new Map<string, string>();
  const departments = new Map<string, string>();
  const designations = new Map<string, string>();

  for (const e of employees) {
    if (e.branch_id && e.branches?.name) branches.set(e.branch_id, e.branches.name);
    if (e.company_id && e.companies) {
      companies.set(e.company_id, payrollCompanyLabel(e.companies));
    }
    if (e.department_id && e.departments?.name) {
      departments.set(e.department_id, e.departments.name);
    }
    if (e.designation_id && e.designations?.name) {
      designations.set(e.designation_id, e.designations.name);
    }
  }

  for (const b of ref?.branches ?? []) branches.set(b.id, b.name);
  for (const c of ref?.companies ?? []) {
    companies.set(c.id, payrollCompanyLabel(c) || c.name);
  }
  for (const d of ref?.departments ?? []) departments.set(d.id, d.name);
  for (const d of ref?.designations ?? []) designations.set(d.id, d.name);

  const toSorted = (m: Map<string, string>): Emp360FilterOption[] =>
    [...m.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

  return {
    branches: toSorted(branches),
    companies: toSorted(companies),
    departments: toSorted(departments),
    designations: toSorted(designations),
  };
}

/** Reset filter IDs that are not in the current option lists (stale URL params). */
export function sanitizeEmp360Filters(
  filters: Emp360Filters,
  options: Emp360FilterOptions,
): Emp360Filters {
  const next = { ...filters };
  if (
    next.branch !== "All" &&
    !options.branches.some((o) => o.id === next.branch)
  ) {
    next.branch = "All";
  }
  if (
    next.company !== "All" &&
    !options.companies.some((o) => o.id === next.company)
  ) {
    next.company = "All";
  }
  if (
    next.department !== "All" &&
    !options.departments.some((o) => o.id === next.department)
  ) {
    next.department = "All";
  }
  if (
    next.designation !== "All" &&
    !options.designations.some((o) => o.id === next.designation)
  ) {
    next.designation = "All";
  }
  return next;
}

export function filterEmployees(employees: EmployeeRow[], filters: Emp360Filters) {
  const q = filters.search.trim().toLowerCase();
  return employees.filter((e) => {
    if (filters.country !== "All" && (e.payroll_country ?? "IN").toUpperCase() !== filters.country) {
      return false;
    }
    if (filters.branch !== "All" && e.branch_id !== filters.branch) return false;
    if (filters.company !== "All" && e.company_id !== filters.company) return false;
    if (filters.department !== "All" && e.department_id !== filters.department) return false;
    if (filters.designation !== "All" && e.designation_id !== filters.designation) return false;
    if (filters.employment !== "All" && employmentTypeLabel(e) !== filters.employment) return false;
    if (!q) return true;
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.emp_code.toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q) ||
      (e.mobile ?? "").includes(q)
    );
  });
}
