# Client → Institution Commission Integration Plan

## Status: PLANNED — Not yet active

## Overview
When fully activated, the system will automatically:
1. Create commission student records when applications are submitted
2. Update visa approval dates from client visa status changes
3. Calculate commission eligibility when tuition payment is confirmed
4. Generate invoice line items automatically
5. Alert admins via AI Suggestions when action is needed

## Activation Checklist (complete before enabling)
- [ ] Confirm existing clients table column names
- [ ] Confirm existing visa_status field values used
- [ ] Confirm existing payment tracking table name
- [ ] Confirm existing workflow stage names
- [ ] Test matching logic with 10 real client records
- [ ] Verify commission calculation accuracy against manual invoices
- [ ] Admin approval before first automated commission record created
- [ ] Run parallel (manual + auto) for one full term before full switch

## Data Flow
Client submits application
  → workflow stage = 'application_submitted'
  → commission_student record created (status: pending)

Visa approved in client record
  → study_permit_approved_date updated
  → commission eligibility partially met

Tuition paid confirmed
  → tuition_paid_amount updated
  → all conditions checked
  → commission_status → eligible
  → AI Suggestion created for admin review

Admin reviews suggestion
  → Approves → student added to claim cycle
  → Invoice line item created
  → Invoice total updated

## Fields That Must Match Between Systems
| Client Table Field | Commission Student Field |
|---|---|
| passport_number | passport_number |
| email | student_email |
| visa_status | triggers study_permit_approved_date |
| intake_term | intake_term |
| institution_id | institution_id |

## Manual Override Always Available
Admin can always manually:
- Link a client to a commission student record
- Override commission status
- Add/remove students from claim cycles
- Edit commission amounts before invoicing