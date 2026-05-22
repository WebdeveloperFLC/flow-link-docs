# Add "Digital Success Hub" section to Team & Roles

Mirror the existing Institutions / Commissions section-access cards with a third card for the Digital Success Hub module, so admins can grant/revoke Hub access per teammate from `/users`.

## Changes

### `src/components/users/ModuleAccessCard.tsx`
- Widen the `module` prop type from `"institutions" | "commissions"` to `"institutions" | "commissions" | "digital_success_hub"`. No other logic changes — it already calls the generic `fetchModuleAccessList` / `saveSingleModulePermission` by module key.

### `src/pages/Users.tsx`
- Update the "Section access" subheading copy to mention all three sections.
- Change the grid from `md:grid-cols-2` to `md:grid-cols-3` (still wraps on smaller widths).
- Add a third `<ModuleAccessCard>` after Commissions:
  - `module="digital_success_hub"`
  - title: **"Digital Success Hub"**
  - description: *"Who can view or manage promotional media, AI Studio assets, client links, and branch notifications."*

No backend / RLS changes — `digital_success_hub` is already a registered module in `CRM_MODULES` and the underlying `dsh_can(uid, 'edit')` checks already read the same `user_module_permissions` table this card writes to.
