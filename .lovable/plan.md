I’ll fix the Team & Roles page so Institutions is visibly separate from Commissions.

Plan:
1. Change the current Institutions/Commissions quick-access area from compact cards above the table into a clear dedicated “Section access” block.
2. Render two distinct side-by-side panels:
   - “Institutions section” for institution access only
   - “Commissions section” for commission access only
3. Keep the existing one-click grant, level change, and revoke controls for both panels.
4. Make the Institutions panel more explicit in wording so it is not confused with the role dropdown.
5. Verify the `/users` page renders the separate Institutions section above the team table.

Technical details:
- Update `src/pages/Users.tsx` layout around the two `ModuleAccessCard` components.
- Reuse `src/components/users/ModuleAccessCard.tsx`; only adjust its copy/layout if needed.
- No database migration is needed, because Institutions already exists as its own module key in `user_module_permissions`.