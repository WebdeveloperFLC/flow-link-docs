# Phase C UAT Checklist

**Environment:** Staging/production after Lovable Publish  
**Tester:** Team UAT  
**Client:** Use a test client with existing profile, tests, education, experience, and documents

## Profile tab — navigation

- [ ] Open client → Profile tab loads `UnifiedProfileCard`
- [ ] Six pills visible: Identity | Contact | Tests | Education | Experience | Client 360
- [ ] `CasePeopleCard` still visible below profile card
- [ ] Tab badges show completion counts (except Client 360)

## Identity — load / save / reload

- [ ] View mode shows identity summaries
- [ ] Edit → change DOB, gender, passport fields → Save
- [ ] Hard refresh → values persisted

## Contact — load / save / reload

- [ ] Edit → change alt phone, address, emergency contact → Save
- [ ] Hard refresh → values persisted

## Tests — load / save / reload

- [ ] English test scores editable
- [ ] Aptitude / language tests editable
- [ ] Active English test selection persists after save + reload

## Education — load / save / reload

- [ ] Add education record → fill fields → Save
- [ ] Edit existing record → Save → reload confirms
- [ ] Remove record → Save → reload confirms removal

## Experience — load / save / reload

- [ ] Add experience record → Save
- [ ] Edit / remove → Save → reload confirms

## Document linking (requires migration publish)

- [ ] Upload document on education record → Save → reload shows link
- [ ] Link existing document → Save → reload shows link
- [ ] Unlink document → Save → reload confirms unlink
- [ ] Delete document from Documents tab → link removed on Profile reload

## Client 360 — read-only

- [ ] Client 360 tab shows highlights and profile summary
- [ ] Registry shows 9 CRM modules
- [ ] **No** Edit, Save, Link, Upload, inputs, or selects on Client 360
- [ ] Registry link to Client Services opens `client-services` tab
- [ ] Registry link to Comms opens `communications` tab
- [ ] Registry link to Activity Log opens `activity-log` tab

## Module isolation

- [ ] Documents tab unchanged
- [ ] Payments tab unchanged
- [ ] Forms tab unchanged
- [ ] Comms tab unchanged
- [ ] Tasks tab unchanged
- [ ] Team & Access tab unchanged
- [ ] Activity Log tab unchanged
- [ ] Client Services tab unchanged

## Regression checks

- [ ] Confirm whether passport re-extract is still required (was on old card)
- [ ] Confirm whether Odoo sync is still required (was on old card)
- [ ] Activity log entry created on profile save

## Sign-off

| Role | Name | Date | Pass/Fail |
|------|------|------|-----------|
| Counselor UAT | | | |
| Product owner | | | |
