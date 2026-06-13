-- =====================================================================
-- Future Link HRMS — Row Level Security (v1)
-- Model: every table is org-scoped. Access derives from role_assignments
-- for the calling auth.uid(). Employees see only their own ESS rows.
-- Mirrors Performance Hub: a helper resolves caller → {org_id, role, employee_id}.
-- =====================================================================

-- ---------- HELPER: caller context ----------
-- Returns the HR role of the current user in a given org (or NULL).
create or replace function current_hr_role(p_org uuid)
returns hr_role language sql stable security definer as $$
  select ra.role from role_assignments ra
  where ra.staff_id = auth.uid() and ra.org_id = p_org
  limit 1;
$$;

-- Returns the employee row id linked to the current user (ESS self-access).
create or replace function current_employee_id(p_org uuid)
returns uuid language sql stable security definer as $$
  select e.id from employees e
  where e.staff_id = auth.uid() and e.org_id = p_org
  limit 1;
$$;

-- Does caller hold a given permission (reads role_permissions)?
create or replace function has_perm(p_org uuid, p_perm text)
returns boolean language plpgsql stable security definer as $$
declare r hr_role; ok boolean;
begin
  r := current_hr_role(p_org);
  if r is null then return false; end if;
  execute format('select rp.%I from role_permissions rp where rp.org_id = $1 and rp.role = $2', 'can_'||p_perm)
    into ok using p_org, r;
  return coalesce(ok,false);
end; $$;

-- Convenience: caller is HR-level (can see all employees in org)
create or replace function is_hr(p_org uuid)
returns boolean language sql stable security definer as $$
  select current_hr_role(p_org) in ('Super Admin','Admin','HR Manager','HR Executive');
$$;

-- Convenience: caller manages this employee (HR, or their reporting manager)
create or replace function manages_employee(p_org uuid, p_emp uuid)
returns boolean language sql stable security definer as $$
  select is_hr(p_org)
      or exists (select 1 from employees e
                 where e.id = p_emp and e.org_id = p_org
                   and e.reporting_mgr_id = current_employee_id(p_org));
$$;

-- ---------- ENABLE RLS ----------
alter table companies          enable row level security;
alter table branches           enable row level security;
alter table shifts             enable row level security;
alter table employees          enable row level security;
alter table employee_documents enable row level security;
alter table payroll_cycles     enable row level security;
alter table attendance         enable row level security;
alter table leave_requests     enable row level security;
alter table approvals          enable row level security;
alter table leave_balances     enable row level security;
alter table compoff_requests   enable row level security;
alter table late_exemptions    enable row level security;
alter table mispunch_requests  enable row level security;
alter table training_records   enable row level security;
alter table holidays           enable row level security;
alter table payroll_lines      enable row level security;
alter table role_permissions   enable row level security;
alter table role_assignments   enable row level security;
alter table audit_log          enable row level security;
alter table policies           enable row level security;

-- ---------- REFERENCE TABLES: any org member may read ----------
create policy ref_read_companies on companies for select
  using (current_hr_role(org_id) is not null or current_employee_id(org_id) is not null);
create policy ref_read_branches on branches for select
  using (current_hr_role(org_id) is not null or current_employee_id(org_id) is not null);
create policy ref_read_shifts on shifts for select
  using (current_hr_role(org_id) is not null or current_employee_id(org_id) is not null);
create policy ref_read_holidays on holidays for select
  using (current_hr_role(org_id) is not null or current_employee_id(org_id) is not null);

-- writes to reference tables require manage_emp / configure
create policy ref_write_shifts on shifts for all
  using (has_perm(org_id,'configure') or has_perm(org_id,'manage_emp'))
  with check (has_perm(org_id,'configure') or has_perm(org_id,'manage_emp'));
create policy ref_write_holidays on holidays for all
  using (has_perm(org_id,'manage_emp')) with check (has_perm(org_id,'manage_emp'));
create policy ref_write_branches on branches for all
  using (has_perm(org_id,'configure')) with check (has_perm(org_id,'configure'));
create policy ref_write_companies on companies for all
  using (has_perm(org_id,'configure')) with check (has_perm(org_id,'configure'));

-- ---------- EMPLOYEES ----------
-- HR sees all; manager sees reports; employee sees self.
create policy emp_select on employees for select using (
  is_hr(org_id)
  or reporting_mgr_id = current_employee_id(org_id)
  or staff_id = auth.uid()
);
create policy emp_write on employees for all
  using (has_perm(org_id,'manage_emp')) with check (has_perm(org_id,'manage_emp'));

-- ---------- EMPLOYEE DOCUMENTS ----------
create policy doc_select on employee_documents for select using (
  is_hr(org_id) or employee_id = current_employee_id(org_id)
);
create policy doc_write on employee_documents for all
  using (has_perm(org_id,'manage_emp')) with check (has_perm(org_id,'manage_emp'));

-- ---------- ATTENDANCE ----------
-- read: HR all, manager reports, employee self.
create policy att_select on attendance for select using (
  is_hr(org_id) or manages_employee(org_id, employee_id) or employee_id = current_employee_id(org_id)
);
-- self punch insert/update for own today's row (apply perm), OR HR/manager edits.
create policy att_self_write on attendance for all using (
  (employee_id = current_employee_id(org_id) and has_perm(org_id,'apply'))
  or manages_employee(org_id, employee_id)
) with check (
  (employee_id = current_employee_id(org_id) and has_perm(org_id,'apply'))
  or manages_employee(org_id, employee_id)
);

-- ---------- LEAVE / COMPOFF / LATE / MISPUNCH (request pattern) ----------
-- employee creates own; HR/manager read team; approve requires approve perm.
create policy leave_select on leave_requests for select using (
  is_hr(org_id) or manages_employee(org_id, employee_id) or employee_id = current_employee_id(org_id)
);
create policy leave_insert on leave_requests for insert with check (
  employee_id = current_employee_id(org_id) and has_perm(org_id,'apply')
  or has_perm(org_id,'manage_emp')
);
create policy leave_update on leave_requests for update using (
  has_perm(org_id,'approve')
  or (employee_id = current_employee_id(org_id) and status = 'Pending')   -- can cancel own pending
) with check (
  has_perm(org_id,'approve')
  or (employee_id = current_employee_id(org_id))
);

create policy compoff_select on compoff_requests for select using (
  is_hr(org_id) or manages_employee(org_id, employee_id) or employee_id = current_employee_id(org_id));
create policy compoff_insert on compoff_requests for insert with check (
  employee_id = current_employee_id(org_id) and has_perm(org_id,'apply') or has_perm(org_id,'manage_emp'));
create policy compoff_update on compoff_requests for update using (has_perm(org_id,'approve'))
  with check (has_perm(org_id,'approve'));

create policy late_select on late_exemptions for select using (
  is_hr(org_id) or manages_employee(org_id, employee_id) or employee_id = current_employee_id(org_id));
create policy late_insert on late_exemptions for insert with check (
  employee_id = current_employee_id(org_id) and has_perm(org_id,'apply') or has_perm(org_id,'manage_emp'));
create policy late_update on late_exemptions for update using (has_perm(org_id,'approve'))
  with check (has_perm(org_id,'approve'));

create policy mispunch_select on mispunch_requests for select using (
  is_hr(org_id) or manages_employee(org_id, employee_id) or employee_id = current_employee_id(org_id));
create policy mispunch_insert on mispunch_requests for insert with check (
  employee_id = current_employee_id(org_id) and has_perm(org_id,'apply') or has_perm(org_id,'manage_emp'));
create policy mispunch_update on mispunch_requests for update using (has_perm(org_id,'approve'))
  with check (has_perm(org_id,'approve'));

-- ---------- APPROVALS TRAIL ----------
create policy appr_select on approvals for select using (
  is_hr(org_id) or approver_id = current_employee_id(org_id));
create policy appr_write on approvals for all using (has_perm(org_id,'approve'))
  with check (has_perm(org_id,'approve'));

-- ---------- LEAVE BALANCES ----------
create policy bal_select on leave_balances for select using (
  is_hr(org_id) or employee_id = current_employee_id(org_id));
create policy bal_write on leave_balances for all using (has_perm(org_id,'manage_emp'))
  with check (has_perm(org_id,'manage_emp'));

-- ---------- TRAINING ----------
create policy train_select on training_records for select using (
  is_hr(org_id) or manages_employee(org_id, employee_id) or employee_id = current_employee_id(org_id));
create policy train_write on training_records for all using (has_perm(org_id,'approve'))
  with check (has_perm(org_id,'approve'));

-- ---------- PAYROLL ----------
create policy cycle_select on payroll_cycles for select using (is_hr(org_id));
create policy cycle_write on payroll_cycles for all using (has_perm(org_id,'approve'))
  with check (has_perm(org_id,'approve'));

create policy line_select on payroll_lines for select using (
  is_hr(org_id) or employee_id = current_employee_id(org_id));   -- ESS can see own payslip line
create policy line_write on payroll_lines for all using (has_perm(org_id,'override') or has_perm(org_id,'approve'))
  with check (has_perm(org_id,'override') or has_perm(org_id,'approve'));

-- ---------- RBAC ----------
create policy rp_select on role_permissions for select using (current_hr_role(org_id) is not null);
create policy rp_write  on role_permissions for all using (has_perm(org_id,'configure'))
  with check (has_perm(org_id,'configure'));
create policy ra_select on role_assignments for select using (is_hr(org_id) or staff_id = auth.uid());
create policy ra_write  on role_assignments for all using (has_perm(org_id,'configure'))
  with check (has_perm(org_id,'configure'));

-- ---------- AUDIT (read for HR; insert by anyone acting; never update/delete) ----------
create policy audit_select on audit_log for select using (is_hr(org_id));
create policy audit_insert on audit_log for insert with check (current_hr_role(org_id) is not null);

-- ---------- POLICIES ----------
create policy pol_select on policies for select using (current_hr_role(org_id) is not null);
create policy pol_write  on policies for all using (has_perm(org_id,'configure'))
  with check (has_perm(org_id,'configure'));

-- NOTE: service_role bypasses RLS — payroll-engine edge functions run as service_role
-- and must re-check permissions in code before mutating locked cycles.
