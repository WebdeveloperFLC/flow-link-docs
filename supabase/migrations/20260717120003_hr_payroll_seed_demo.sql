-- =====================================================================
-- Future Link HRMS — Demo Seed (mirrors prototype seed)
-- Run AFTER 01_schema, 02_rls, 03_functions. Uses a fixed demo org_id.
-- Safe to re-run: truncates demo data for the demo org first.
-- =====================================================================

do $$
declare
  v_org   uuid := '00000000-0000-0000-0000-0000000000f1';  -- demo org (replace with your real CRM org_id)
  v_co_pl uuid; v_co_ac uuid;
  v_vad uuid; v_ahm uuid; v_sur uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid;
  v_isha uuid; v_karan uuid; v_priya uuid; v_sneha uuid; v_imran uuid;
  v_cycle uuid;
begin
  -- ---- clean demo rows ----
  delete from audit_log where org_id=v_org;
  delete from payroll_lines where org_id=v_org;
  delete from salary_slips where org_id=v_org;
  delete from payroll_cycles where org_id=v_org;
  delete from attendance where org_id=v_org;
  delete from leave_requests where org_id=v_org;
  delete from compoff_requests where org_id=v_org;
  delete from late_exemptions where org_id=v_org;
  delete from mispunch_requests where org_id=v_org;
  delete from training_records where org_id=v_org;
  delete from leave_balances where org_id=v_org;
  delete from holidays where org_id=v_org;
  delete from employee_documents where org_id=v_org;
  delete from employees where org_id=v_org;
  delete from shifts where org_id=v_org;
  delete from companies where org_id=v_org;
  delete from role_permissions where org_id=v_org;

  -- ---- companies & branches ----
  insert into companies(org_id,name) values (v_org,'FL Pvt. Ltd.') returning id into v_co_pl;
  insert into companies(org_id,name) values (v_org,'FL Academic') returning id into v_co_ac;
  -- reuse CRM branches (Genda Circle = Vadodara demo, Anand, Bharuch)
  select id into v_vad from public.branches where name = 'Genda Circle' limit 1;
  if v_vad is null then
    select id into v_vad from public.branches where is_active = true order by display_order limit 1;
  end if;
  select id into v_ahm from public.branches where name = 'Anand' limit 1;
  if v_ahm is null then v_ahm := v_vad; end if;
  select id into v_sur from public.branches where name = 'Bharuch' limit 1;
  if v_sur is null then v_sur := v_vad; end if;

  -- ---- shifts ----
  insert into shifts(org_id,name,type,login_time,logout_time,work_hours,grace_min,break_min,half_day_after_min,ot_eligible)
    values (v_org,'Day Shift','Day','10:00','19:00',9,5,45,60,true) returning id into v_s1;
  insert into shifts(org_id,name,type,login_time,logout_time,work_hours,grace_min,break_min,half_day_after_min,ot_eligible)
    values (v_org,'Night Shift','Night','19:00','04:00',9,5,30,60,true) returning id into v_s2;
  insert into shifts(org_id,name,type,login_time,logout_time,work_hours,grace_min,break_min,half_day_after_min,ot_eligible)
    values (v_org,'Part-Time','Custom','10:00','14:00',4,5,15,30,false) returning id into v_s3;

  -- ---- employees (basic auto-derived 50/20/conv/special as prototype) ----
  insert into employees(org_id,emp_code,full_name,gender,dob,mobile,email,addr_current,addr_permanent,emergency,
     designation,department,company_id,branch_id,employment_type,date_of_joining,notice_period,work_week,status,shift_id,
     monthly_gross,basic,hra,conveyance,special_allow,incentive,bonus,pf_applicable,pf_number,uan,esic_applicable,esic_number,
     bank_holder_name,bank_name,bank_account_number,bank_ifsc,bank_branch,bank_account_type,bank_verified)
    values (v_org,'FL-1042','Isha Sikligar','Female','1994-03-14','+91 98250 11223','isha.s@futurelink.in',
     '12 Alkapuri, Vadodara','12 Alkapuri, Vadodara','Ramesh S · +91 99999 00011',
     'Sr. Counsellor','Counselling',v_co_pl,v_vad,'Full-Time','2022-01-10','30 days','6-Day','Confirmed',v_s1,
     42000,21000,8400,1600,11000,0,0,true,'GJ/VAD/0099123','100928374651',false,'31009912345',
     'Isha Sikligar','HDFC Bank','50100123456789','HDFC0001234','Alkapuri, Vadodara','Savings',true) returning id into v_isha;

  insert into employees(org_id,emp_code,full_name,gender,dob,mobile,email,designation,department,company_id,branch_id,
     employment_type,date_of_joining,work_week,status,shift_id,monthly_gross,basic,hra,conveyance,special_allow,
     pf_applicable,pf_number,uan,esic_applicable,esic_number)
    values (v_org,'FL-1043','Karan Joshi','Male','1997-08-02','+91 98765 44556','karan.j@futurelink.in',
     'Trainer','IELTS Training',v_co_ac,v_ahm,'Full-Time','2026-04-05','6-Day','On Probation',v_s1,
     38000,19000,7600,1600,9800,true,'GJ/AHM/0044871','100928374652',false,'31004487122') returning id into v_karan;

  insert into employees(org_id,emp_code,full_name,gender,dob,mobile,email,designation,department,company_id,branch_id,
     employment_type,date_of_joining,work_week,status,shift_id,monthly_gross,basic,hra,conveyance,special_allow,
     pf_applicable,pf_number,uan,esic_applicable,esic_number)
    values (v_org,'FL-1044','Priya Sharma','Female','1992-11-21','+91 90000 12345','priya.s@futurelink.in',
     'Visa Officer','Documentation',v_co_pl,v_vad,'Full-Time','2021-06-18','6-Day','Confirmed',v_s1,
     45000,22500,9000,1600,11900,true,'GJ/VAD/0099201','100928374653',false,'31009920188') returning id into v_priya;

  insert into employees(org_id,emp_code,full_name,gender,dob,mobile,email,designation,department,company_id,branch_id,
     employment_type,date_of_joining,work_week,status,shift_id,monthly_gross,basic,hra,conveyance,special_allow,
     pf_applicable,pf_number,uan,esic_applicable,esic_number)
    values (v_org,'FL-1046','Sneha Patel','Female','1996-02-09','+91 91111 22233','sneha.p@futurelink.in',
     'Counsellor','Counselling',v_co_pl,v_sur,'Full-Time','2023-03-12','5-Day','Confirmed',v_s1,
     34000,17000,6800,1600,8600,true,'GJ/SUR/0033451','100928374654',false,'31003345109') returning id into v_sneha;

  insert into employees(org_id,emp_code,full_name,gender,dob,mobile,email,designation,department,company_id,branch_id,
     employment_type,date_of_joining,work_week,status,shift_id,monthly_gross,basic,hra,conveyance,special_allow,
     pf_applicable,pf_number,uan,esic_applicable,esic_number)
    values (v_org,'FL-1047','Imran Shaikh','Male','1989-07-30','+91 93333 44455','imran.s@futurelink.in',
     'Sr. Trainer','IELTS Training',v_co_ac,v_ahm,'Full-Time','2020-09-22','6-Day','Confirmed',v_s1,
     52000,26000,10400,1600,14000,true,'GJ/AHM/0044120','100928374655',false,'31004412055') returning id into v_imran;

  -- reporting lines (Isha & Priya → managers conceptually; demo self-managed under HR)
  update employees set reporting_mgr_id = v_imran where id in (v_karan);  -- Imran manages Karan (demo)

  -- ---- documents (metadata only; files would be in Storage) ----
  insert into employee_documents(org_id,employee_id,doc_type,file_name,mime) values
    (v_org,v_isha,'Offer Letter','offer_isha.pdf','application/pdf'),
    (v_org,v_isha,'Aadhaar Card','aadhaar_isha.jpg','image/jpeg'),
    (v_org,v_isha,'PAN Card','pan_isha.pdf','application/pdf'),
    (v_org,v_karan,'Offer Letter','offer_karan.pdf','application/pdf'),
    (v_org,v_priya,'Passport','passport_priya.pdf','application/pdf'),
    (v_org,v_imran,'Form 16','form16_imran.pdf','application/pdf');

  -- ---- holidays ----
  insert into holidays(org_id,holiday_date,name,type) values
    (v_org,'2026-08-15','Independence Day','National'),
    (v_org,'2026-08-19','Raksha Bandhan','Festival'),
    (v_org,'2026-10-02','Gandhi Jayanti','National'),
    (v_org,'2026-10-20','Diwali','Festival'),
    (v_org,'2026-12-31','Year-End (optional)','Optional');

  -- ---- payroll cycle (26 May – 25 Jun 2026, 30 days) ----
  insert into payroll_cycles(org_id,label,start_date,end_date,payroll_days,status)
    values (v_org,'26 May 2026 – 25 Jun 2026','2026-05-26','2026-06-25',30,'Draft') returning id into v_cycle;

  -- ---- attendance sample (June window; mirrors prototype) ----
  -- Isha: 1 late>5m, 1 mispunch (missing out on 05 Jun)
  insert into attendance(org_id,employee_id,work_date,check_in,check_out,break_start,break_end,break_min,status,is_mispunch,source) values
    (v_org,v_isha,'2026-06-05','10:04',null,'13:30','14:10',40,'Present',true,'manual'),
    (v_org,v_isha,'2026-06-06','10:22','19:05','13:30','14:15',45,'Present',false,'manual'),
    (v_org,v_isha,'2026-06-07',null,null,null,null,null,'Week Off',false,'manual'),
    (v_org,v_isha,'2026-06-08','10:02','19:30','13:30','14:14',44,'Present',false,'manual'),
    (v_org,v_isha,'2026-06-09','10:01','19:00','13:30','14:12',42,'Present',false,'manual'),
    (v_org,v_isha,'2026-06-10','10:03','19:02','13:30','14:13',43,'Present',false,'manual'),
    (v_org,v_isha,'2026-06-11','10:00','19:01','13:30','14:10',40,'Present',false,'manual'),
    (v_org,v_isha,'2026-06-12','10:02','19:04','13:30','14:12',42,'Present',false,'manual');
  -- Karan: 2 leave days, 1 mispunch
  insert into attendance(org_id,employee_id,work_date,check_in,check_out,break_min,status,is_mispunch,source) values
    (v_org,v_karan,'2026-06-05',null,'19:00',null,'Present',true,'manual'),
    (v_org,v_karan,'2026-06-06','10:30','19:00',45,'Present',false,'manual'),
    (v_org,v_karan,'2026-06-07',null,null,null,'Week Off',false,'manual'),
    (v_org,v_karan,'2026-06-08','10:20','19:00',45,'Present',false,'manual'),
    (v_org,v_karan,'2026-06-09',null,null,null,'Leave',false,'manual'),
    (v_org,v_karan,'2026-06-10',null,null,null,'Leave',false,'manual'),
    (v_org,v_karan,'2026-06-11','10:15','19:00',45,'Present',false,'manual'),
    (v_org,v_karan,'2026-06-12','10:08','19:00',45,'Present',false,'manual');
  -- Priya: one Half Day (late 11:12)
  insert into attendance(org_id,employee_id,work_date,check_in,check_out,break_min,status,is_mispunch,source) values
    (v_org,v_priya,'2026-06-10','11:12','19:10',45,'Half Day',false,'manual'),
    (v_org,v_priya,'2026-06-11','10:20','19:00',45,'Present',false,'manual');
  -- Sneha: 1 unauthorized leave + 3 leave
  insert into attendance(org_id,employee_id,work_date,status,is_mispunch,source) values
    (v_org,v_sneha,'2026-06-08','Unauthorized Leave',false,'manual'),
    (v_org,v_sneha,'2026-06-09','Leave',false,'manual'),
    (v_org,v_sneha,'2026-06-10','Leave',false,'manual'),
    (v_org,v_sneha,'2026-06-11','Leave',false,'manual');

  -- ---- requests ----
  insert into leave_requests(org_id,employee_id,type,from_date,to_date,days,reason,has_document,status) values
    (v_org,v_isha,'Annual Leave','2026-06-09','2026-06-09',1,'Personal work',true,'Approved'),
    (v_org,v_karan,'Sick Leave','2026-06-09','2026-06-10',2,'Fever — medical attached',true,'Pending'),
    (v_org,v_priya,'Casual Leave','2026-06-12','2026-06-12',0.5,'Bank visit',false,'Pending');
  insert into compoff_requests(org_id,employee_id,worked_date,occasion,reason,status) values
    (v_org,v_karan,'2026-06-08','Worked on Weekly Off','Batch demo','Approved'),
    (v_org,v_imran,'2026-06-02','Worked on Festival Holiday','Exam invigilation','Pending');
  insert into late_exemptions(org_id,employee_id,late_date,official_in,actual_in,delay_min,reason,status) values
    (v_org,v_priya,'2026-06-10','10:00','11:12',72,'Doctor appointment','Pending'),
    (v_org,v_sneha,'2026-06-05','10:00','10:01',1,'Within grace','Pending');
  insert into mispunch_requests(org_id,employee_id,punch_date,issue,evidence,status) values
    (v_org,v_isha,'2026-06-05','Missing Punch Out','Screenshot','Pending'),
    (v_org,v_karan,'2026-06-05','Missing Punch In','Manager email','Approved');
  insert into training_records(org_id,employee_id,type,duration,unpaid_days,start_date,status) values
    (v_org,v_karan,'Paid Training','30 days',0,'2026-04-05','In Progress');

  -- ---- leave balances (illustrative) ----
  insert into leave_balances(org_id,employee_id,policy_year,type,entitled,accrued,taken) values
    (v_org,v_isha,2026,'Annual Leave',18,9,1),
    (v_org,v_karan,2026,'Sick Leave',8,2,0),
    (v_org,v_sneha,2026,'Annual Leave',10,5,3);

  -- ---- RBAC defaults (mirror prototype defaultAccess) ----
  insert into role_permissions(org_id,role,can_view,can_apply,can_approve,can_override,can_export,can_configure,can_manage_emp,screens) values
    (v_org,'Super Admin', true,true,true,true,true,true,true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":true,"roles":true,"audit":true}'::jsonb),
    (v_org,'Admin',       true,true,true,true,true,true,true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":true,"roles":true,"audit":true}'::jsonb),
    (v_org,'HR Manager',  true,true,true,true,true,false,true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":true,"audit":true}'::jsonb),
    (v_org,'HR Executive',true,true,true,false,true,false,true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":false,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":false,"audit":true}'::jsonb),
    (v_org,'Manager',     true,true,true,false,false,false,false,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":false,"shifts":false,"training":true,"calculator":false,"verify":false,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":false,"config":false,"roles":false,"audit":false}'::jsonb),
    (v_org,'Employee',    true,true,false,false,false,false,false,
      '{"dashboard":false,"ess":true,"emp360":false,"employees":false,"shifts":false,"training":false,"calculator":false,"verify":false,"attendance":false,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":false,"audit":false}'::jsonb);

  -- ---- build draft payroll lines for the cycle ----
  perform fn_build_payroll_line(v_isha,  v_cycle);
  perform fn_build_payroll_line(v_karan, v_cycle);
  perform fn_build_payroll_line(v_priya, v_cycle);
  perform fn_build_payroll_line(v_sneha, v_cycle);
  perform fn_build_payroll_line(v_imran, v_cycle);

  insert into audit_log(org_id,actor_label,action,target,new_value)
    values (v_org,'System','Seed loaded','Demo org initialised','5 employees, 1 cycle');

  raise notice 'Seed complete: org=%, cycle=%', v_org, v_cycle;
end $$;
