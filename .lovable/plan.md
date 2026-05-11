I checked the current assessment admin implementation and the live page. The reason it feels like “only client invitation” is showing is that the admin page defaults to the Send invite tab, while the other tabs are plain tables with no dashboard, no counts, no queue, no client-detail integration, no PDF wrapper UI, and no visible test/demo flow. Also, Submissions is empty because no assessment session has been completed yet, not because the code is completely absent.

Plan to make this visibly better in the next build pass:

1. Upgrade `/assessment-admin` from a basic tab page into a real counselor assessment console
   - Add top summary cards: invitations, in-progress sessions, submitted reports, average/latest CRS.
   - Add a proper queue view above/alongside the tabs so staff immediately see status, not just an invite form.
   - Keep Send invite, Submissions, Questions, Programs, but make each tab show useful empty states and actions.

2. Add missing invitation management visibility
   - Add an Invitations tab/table with client name, email, phone, status, expiry, referral/invite source, and copy-link/resend actions where supported.
   - This directly addresses “why only invitation option” by showing all invitation records, not only the create form.

3. Add referral-code visibility and public entry clarity
   - Show the public assessment link `/assessment` clearly in admin.
   - Add a staff-visible referral-code panel/empty state so the public flow is obvious.
   - If referral codes are currently hardcoded/placeholder in the backend, add a small managed referral-code table and UI so the feature is real, not hidden.

4. Improve the question/program management UI so work is visible
   - Add counts by section/goal.
   - Add search/filter for questions.
   - Add better labels for Permanent Residence / CRS scoring.
   - Add “active/inactive” and section grouping so it does not look like a raw developer table.

5. Add staff client integration that was promised in the plan but not yet visible
   - On `ClientDetail`, add an Assessment section/tab/card showing assessment sessions for that client.
   - Add “Send assessment invite”, “Copy link”, “View latest CRS”, and “Download report” when submitted.

6. Fix route mismatch and navigation confusion
   - The current route is `/assessment-admin`, while the plan mentioned `/admin/assessment/...`; I will keep existing routing but make navigation labels clear.
   - Ensure the sidebar “Canada Assessment” opens the improved console.

7. Validate the visible flow
   - Check that `/assessment-admin` shows the new console.
   - Check that Questions and Programs data load.
   - Check that Submissions empty state explains that completed assessments will appear after registration + verification + submission.

Important note on credits/history:
- I cannot refund credits from inside the project. For credit/billing disputes, you’ll need Lovable support.
- I also should not manually “reverse history” with code. If you want to restore a prior version, use History or the revert button under an earlier AI message.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>