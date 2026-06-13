-- =====================================================================
-- Future Link HRMS — Payroll Engine (Postgres)
-- EXACT port of the verified prototype engine + Excel formula.
-- These are the single source of truth; the React client must NOT
-- re-implement the maths — it calls compute_payroll_line / a view.
-- =====================================================================

-- ---------- LATE DEDUCTION SLAB (nested-IF from Excel, NOT the doc table) ----------
create or replace function fn_late_deduction(p_late int)
returns numeric language sql immutable as $$
  select case
    when p_late <= 3  then 0
    when p_late <= 6  then 0.5
    when p_late <= 9  then 1
    when p_late <= 12 then 1.5
    when p_late <= 15 then 2
    when p_late <= 18 then 2.5
    when p_late <= 21 then 3
    when p_late <= 24 then 3.5
    when p_late <= 27 then 4
    else 5
  end::numeric;
$$;

-- ---------- MISPUNCH DEDUCTION (2 free, then 0.5 each) ----------
create or replace function fn_mispunch_deduction(p_mis int)
returns numeric language sql immutable as $$
  select case when p_mis <= 2 then 0 else (p_mis - 2) * 0.5 end::numeric;
$$;

-- ---------- CORE PAYROLL (mirrors computePayroll) ----------
-- Returns a single jsonb so the client gets every derived field at once.
create or replace function fn_compute_payroll(
  p_payroll_days  int,
  p_monthly       numeric,
  p_basic         numeric,
  p_incentive     numeric default 0,
  p_bonus         numeric default 0,
  p_pf_applicable boolean default true,
  p_esic_applicable boolean default false,
  p_leaves        numeric default 0,
  p_paid_leaves   numeric default 0,
  p_late          int default 0,
  p_ul            int default 0,
  p_sandwich      numeric default 0,
  p_mispunch      int default 0,
  p_compoff       numeric default 0,
  p_unpaid_training int default 0
) returns jsonb language plpgsql immutable as $$
declare
  k numeric; n numeric; payable numeric; daily numeric; gross numeric;
  basic numeric; pf_wage numeric; pf_emp numeric; esic_emp numeric; net numeric;
begin
  k := fn_late_deduction(p_late);
  n := fn_mispunch_deduction(p_mispunch);
  payable := p_payroll_days - coalesce(p_leaves,0) + coalesce(p_paid_leaves,0)
             + coalesce(p_compoff,0) - k - (coalesce(p_ul,0) * 2)
             - coalesce(p_sandwich,0) - n - coalesce(p_unpaid_training,0);
  daily := round(p_monthly / nullif(p_payroll_days,0), 2);
  gross := round(daily * payable);
  basic := coalesce(p_basic, round(p_monthly * 0.5));
  pf_wage := least(basic, 15000);
  pf_emp  := case when p_pf_applicable then round(pf_wage * 0.12) else 0 end;
  esic_emp := case when p_esic_applicable and p_monthly <= 21000 then round(gross * 0.0075) else 0 end;
  net := gross + coalesce(p_incentive,0) + coalesce(p_bonus,0) - pf_emp - esic_emp;
  return jsonb_build_object(
    'late_deduction', k,
    'mispunch_deduction', n,
    'payable_days', round(payable, 2),
    'daily_rate', daily,
    'gross_earned', gross,
    'pf_employee', pf_emp,
    'esic_employee', esic_emp,
    'incentive', coalesce(p_incentive,0),
    'bonus', coalesce(p_bonus,0),
    'net_salary', round(net)
  );
end; $$;

-- ---------- ATTENDANCE ROLL-UP (mirrors rollup() + deriveInputs) ----------
-- Aggregates one employee's attendance + approved requests for a cycle window.
create or replace function fn_rollup_inputs(p_employee uuid, p_cycle uuid)
returns jsonb language plpgsql stable as $$
declare
  c record; e record; sh record;
  v_late int := 0; v_mis int := 0; v_leaves numeric := 0; v_woff int := 0;
  v_working numeric := 0; v_ul int := 0; v_paid numeric := 0; v_compoff numeric := 0;
  v_sandwich numeric := 0; v_train int := 0;
  v_late_exempt int := 0; v_mis_approved int := 0;
begin
  select * into c from payroll_cycles where id = p_cycle;
  select * into e from employees where id = p_employee;
  select * into sh from shifts where id = e.shift_id;

  -- attendance window
  select
    count(*) filter (where status='Present')
      + count(*) filter (where status='Half Day') * 0.5,
    count(*) filter (where status in ('Leave','Sick Leave')),
    count(*) filter (where status in ('Week Off','Holiday')),
    count(*) filter (where status='Unauthorized Leave'),
    count(*) filter (where is_mispunch),
    count(*) filter (where check_in is not null
       and (extract(epoch from check_in)/60) - (extract(epoch from coalesce(sh.login_time,'10:00'))/60) > coalesce(sh.grace_min,5)
       and status not in ('Week Off','Holiday','Leave','Sick Leave','Unauthorized Leave','Absent'))
  into v_working, v_leaves, v_woff, v_ul, v_mis, v_late
  from attendance
  where employee_id = p_employee and work_date between c.start_date and c.end_date;

  -- approved paid leave days (non-unpaid) in window
  select coalesce(sum(days),0) into v_paid from leave_requests
  where employee_id=p_employee and status='Approved' and type <> 'Unpaid Leave'
    and from_date between c.start_date and c.end_date;

  -- approved comp-off count
  select count(*) into v_compoff from compoff_requests
  where employee_id=p_employee and status='Approved'
    and worked_date between c.start_date and c.end_date;

  -- approved late exemptions (delay beyond grace) reduce late count
  select count(*) into v_late_exempt from late_exemptions
  where employee_id=p_employee and status='Approved'
    and delay_min > coalesce(sh.grace_min,5)
    and late_date between c.start_date and c.end_date;

  -- approved mispunch corrections reduce mispunch count
  select count(*) into v_mis_approved from mispunch_requests
  where employee_id=p_employee and status='Approved'
    and punch_date between c.start_date and c.end_date;

  -- sandwich leaves flagged in window (see business rules: auto-calc is v1.1)
  select coalesce(sum(case when is_sandwich then 1 else 0 end),0) into v_sandwich
  from leave_requests
  where employee_id=p_employee and status='Approved'
    and from_date between c.start_date and c.end_date;

  -- unpaid training days overlapping window
  select coalesce(sum(unpaid_days),0) into v_train from training_records
  where employee_id=p_employee and status <> 'Cancelled';

  return jsonb_build_object(
    'late', greatest(0, v_late - v_late_exempt),
    'mispunch', greatest(0, v_mis - v_mis_approved),
    'leaves', v_leaves,
    'paid_leaves', v_paid,
    'comp_off', v_compoff,
    'ul', v_ul,
    'sandwich', v_sandwich,
    'unpaid_training', v_train,
    'working', round(v_working,1),
    'week_off', v_woff
  );
end; $$;

-- ---------- BUILD / REFRESH A PAYROLL LINE (Draft only) ----------
-- Combines rollup + compute and upserts into payroll_lines. Refuses if cycle Locked.
create or replace function fn_build_payroll_line(p_employee uuid, p_cycle uuid)
returns payroll_lines language plpgsql security definer as $$
declare
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
begin
  select * into c from payroll_cycles where id = p_cycle;
  if c.status <> 'Draft' then
    raise exception 'Cycle % is %; cannot rebuild line', c.label, c.status;
  end if;
  select * into e from employees where id = p_employee;

  -- existing override? (SELECT INTO sets NULL when no row — coalesce before insert)
  use_override := false;
  ov := null;
  select is_overridden, override_json into use_override, ov
  from payroll_lines where cycle_id=p_cycle and employee_id=p_employee;
  use_override := coalesce(use_override, false);

  if use_override then
    inp := ov;   -- manual inputs win
  else
    inp := fn_rollup_inputs(p_employee, p_cycle);
  end if;

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
    e.pf_applicable, e.esic_applicable,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric,
    (inp->>'late')::int, (inp->>'ul')::int, (inp->>'sandwich')::numeric,
    (inp->>'mispunch')::int, (inp->>'comp_off')::numeric, (inp->>'unpaid_training')::int
  );

  insert into payroll_lines as pl (
    org_id, cycle_id, employee_id, payroll_days, monthly_gross, basic,
    leaves_taken, paid_leaves, comp_off, late_count, mispunch_count, ul_count,
    sandwich_count, unpaid_training, late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, net_salary, is_overridden, override_json
  ) values (
    e.org_id, p_cycle, p_employee, c.payroll_days, e.monthly_gross, e.basic,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric, (inp->>'comp_off')::numeric,
    (inp->>'late')::int, (inp->>'mispunch')::int, (inp->>'ul')::int,
    (inp->>'sandwich')::numeric, (inp->>'unpaid_training')::int,
    (calc->>'late_deduction')::numeric, (calc->>'mispunch_deduction')::numeric,
    (calc->>'payable_days')::numeric, (calc->>'daily_rate')::numeric,
    (calc->>'gross_earned')::numeric, (calc->>'incentive')::numeric, (calc->>'bonus')::numeric,
    (calc->>'pf_employee')::numeric, (calc->>'esic_employee')::numeric, (calc->>'net_salary')::numeric,
    coalesce(use_override, false), ov
  )
  on conflict (cycle_id, employee_id) do update set
    payroll_days=excluded.payroll_days, monthly_gross=excluded.monthly_gross, basic=excluded.basic,
    leaves_taken=excluded.leaves_taken, paid_leaves=excluded.paid_leaves, comp_off=excluded.comp_off,
    late_count=excluded.late_count, mispunch_count=excluded.mispunch_count, ul_count=excluded.ul_count,
    sandwich_count=excluded.sandwich_count, unpaid_training=excluded.unpaid_training,
    late_deduction=excluded.late_deduction, mispunch_deduction=excluded.mispunch_deduction,
    payable_days=excluded.payable_days, daily_rate=excluded.daily_rate, gross_earned=excluded.gross_earned,
    incentive=excluded.incentive, bonus=excluded.bonus,     pf_employee=excluded.pf_employee,
    esic_employee=excluded.esic_employee, net_salary=excluded.net_salary,
    is_overridden=excluded.is_overridden, override_json=excluded.override_json
  returning * into row;
  return row;
end; $$;

-- ---------- DERIVE PUNCH STATUS (mirrors derivePunchStatus) ----------
-- Called from attendance trigger when check_in/check_out change.
create or replace function fn_derive_status(
  p_in time, p_out time, p_status att_status, p_login time, p_half_after int, p_is_mispunch boolean
) returns jsonb language plpgsql immutable as $$
declare ci int; co int; lg int; mp boolean; st att_status;
begin
  -- manual statuses preserved
  if p_status in ('Leave','Sick Leave','Week Off','Holiday','Unauthorized Leave') then
    return jsonb_build_object('status', p_status, 'is_mispunch', p_is_mispunch);
  end if;
  ci := case when p_in  is null then null else extract(epoch from p_in)/60 end;
  co := case when p_out is null then null else extract(epoch from p_out)/60 end;
  lg := extract(epoch from coalesce(p_login,'10:00'))/60;
  if ci is null and co is null then
    return jsonb_build_object('status','Absent','is_mispunch',false);
  end if;
  mp := (ci is null) <> (co is null);            -- exactly one punch
  st := 'Present';
  if ci is not null and (ci - lg) > coalesce(p_half_after,60) then st := 'Half Day'; end if;
  return jsonb_build_object('status', st, 'is_mispunch', mp);
end; $$;

create or replace function trg_attendance_derive() returns trigger language plpgsql as $$
declare sh record; d jsonb;
begin
  select s.* into sh from shifts s join employees e on e.shift_id=s.id where e.id = new.employee_id;
  d := fn_derive_status(new.check_in, new.check_out, new.status,
        coalesce(sh.login_time,'10:00'), coalesce(sh.half_day_after_min,60), new.is_mispunch);
  -- only auto-set when punches drove the change (status not explicitly manual)
  if new.status not in ('Leave','Sick Leave','Week Off','Holiday','Unauthorized Leave') then
    new.status := (d->>'status')::att_status;
    new.is_mispunch := (d->>'is_mispunch')::boolean;
  end if;
  -- derive break_min if both break punches present and not overridden
  if new.break_min is null and new.break_start is not null and new.break_end is not null then
    new.break_min := greatest(0, (extract(epoch from new.break_end)-extract(epoch from new.break_start))/60);
  end if;
  return new;
end; $$;
drop trigger if exists attendance_derive on attendance;
create trigger attendance_derive before insert or update of check_in, check_out, break_start, break_end, status
  on attendance for each row execute function trg_attendance_derive();
