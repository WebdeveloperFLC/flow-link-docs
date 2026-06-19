#!/usr/bin/env node
/**
 * Build accounting-module-full.zip — complete accounting module for external review.
 * Strips demo seed arrays in staged mock files only (production source unchanged).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = join(ROOT, '.zip-staging-accounting-full');
const OUT = join(ROOT, 'accounting-module-full.zip');
const OLD = join(ROOT, 'accounting-module-no-owners.zip');

const MIGRATION_PREFIXES = [
  '20260509144647', // client invoice payments (CRM AR bridge)
  '20260515054022',
  '20260516055523',
  '20260516060234',
  '20260517224518',
  '20260517224545',
  '20260517224613',
  '20260517224646',
  '20260517224710',
  '20260517233519',
  '20260518000357',
  '20260518001141',
  '20260518142115',
  '20260518210800',
  '20260518220250',
  '20260518221710',
  '20260519024118',
  '20260519042139',
  '20260519153922',
  '20260519155345',
  '20260522205625',
  '20260522230443',
  '20260522231621',
  '20260523004405',
  '20260523150056',
  '20260523154539',
  '20260523160158',
  '20260523163353',
  '20260523212657',
  '20260525151618',
  '20260527101155',
  '20260530145814',
];

const EDGE_FUNCTIONS = [
  'accounting-create-user',
  'accounting-update-user',
  'ai-financial-assistant',
  'extract-card-statement',
  'extract-document-data',
  'classify-document',
];

function copyFile(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
}

function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true });
}

function stripMockData(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      stripMockData(p);
      continue;
    }
    if (!name.startsWith('mock') || !name.endsWith('.ts')) continue;
    let text = readFileSync(p, 'utf8');
    // Empty exported const arrays (MOCK_*, SEED_*)
    text = text.replace(
      /export const (MOCK_[A-Z0-9_]+|SEED_[A-Z0-9_]+)(?::[^=]+)?\s*=\s*\[[\s\S]*?\];/g,
      'export const $1 = [];',
    );
    writeFileSync(p, text);
  }
}

rmSync(STAGING, { recursive: true, force: true });
rmSync(OUT, { force: true });
rmSync(OLD, { force: true });
mkdirSync(STAGING, { recursive: true });

// Frontend — full accounting module + integration glue
copyDir(join(ROOT, 'src/accounting'), join(STAGING, 'src/accounting'));
copyFile(join(ROOT, 'src/App.tsx'), join(STAGING, 'src/App.tsx'));
copyDir(join(ROOT, 'src/components/layout'), join(STAGING, 'src/components/layout'));
copyDir(join(ROOT, 'src/components/ui'), join(STAGING, 'src/components/ui'));
copyDir(join(ROOT, 'src/integrations/supabase'), join(STAGING, 'src/integrations/supabase'));
copyDir(join(ROOT, 'src/contexts'), join(STAGING, 'src/contexts'));

for (const f of ['utils.ts', 'timeline.ts', 'appNotifications.ts', 'modulePermissions.ts']) {
  const src = join(ROOT, 'src/lib', f);
  if (existsSync(src)) copyFile(src, join(STAGING, 'src/lib', f));
}

for (const f of ['ClientInvoicesPanel.tsx', 'ClientPaymentsCard.tsx']) {
  const src = join(ROOT, 'src/components/clients', f);
  if (existsSync(src)) copyFile(src, join(STAGING, 'src/components/clients', f));
}

stripMockData(join(STAGING, 'src/accounting/data'));

// Backend
const migDir = join(STAGING, 'supabase/migrations');
mkdirSync(migDir, { recursive: true });
for (const prefix of MIGRATION_PREFIXES) {
  const file = readdirSync(join(ROOT, 'supabase/migrations')).find((f) => f.startsWith(prefix));
  if (file) copyFile(join(ROOT, 'supabase/migrations', file), join(migDir, file));
}

for (const fn of EDGE_FUNCTIONS) {
  const src = join(ROOT, 'supabase/functions', fn);
  if (existsSync(src)) copyDir(src, join(STAGING, 'supabase/functions', fn));
}

// Docs
const docSrc = join(ROOT, 'docs/system-map/flows/accounting-and-approvals.md');
if (existsSync(docSrc)) {
  copyFile(docSrc, join(STAGING, 'docs/system-map/flows/accounting-and-approvals.md'));
}

writeFileSync(
  join(STAGING, 'BUNDLE_README.md'),
  `# Accounting module — full bundle

Generated for external architecture / implementation review (ChatGPT, etc.).

## Contents

| Area | Path |
|------|------|
| Full accounting UI + stores | \`src/accounting/**\` (includes owners + wealth summary) |
| Routes & nav | \`src/App.tsx\`, \`src/components/layout/AppLayout.tsx\` |
| Supabase client | \`src/integrations/supabase/**\` |
| Shared UI (shadcn) | \`src/components/ui/**\` |
| CRM payment panels | \`ClientInvoicesPanel.tsx\`, \`ClientPaymentsCard.tsx\` |
| Auth context | \`src/contexts/AuthContext.tsx\` |
| Migrations | \`supabase/migrations/*\` (${MIGRATION_PREFIXES.length} accounting + AR files) |
| Edge functions | \`supabase/functions/*\` (${EDGE_FUNCTIONS.join(', ')}) |
| Flow doc | \`docs/system-map/flows/accounting-and-approvals.md\` |

## Scaffold-only mocks

All \`src/accounting/data/mock*.ts\` files in this zip have **empty arrays** — no demo owners, bills, or seed COA data. Live data is in Supabase.

## Delete controls (owners / wealth)

- **Owner list** — per-owner Delete
- **Owner detail** — Delete profile + per-account Delete
- **Wealth summary** — "Clear all wealth data" purges all \`owner_profiles\` + \`financial_accounts\`

## Start here

1. Read \`BUNDLE_README.md\` (this file)
2. Read \`MISSING_FILES_MANIFEST.md\` for repo files not bundled
3. Read \`docs/system-map/flows/accounting-and-approvals.md\`
4. Trace routes in \`src/App.tsx\` → pages under \`src/accounting/pages/\`

## Not in this zip

See \`MISSING_FILES_MANIFEST.md\` — includes HR/incentive migrations, most CRM tables, \`accounting_documents\` migration (referenced in code, not yet in repo), and non-accounting edge functions.
`,
);

writeFileSync(
  join(STAGING, 'MISSING_FILES_MANIFEST.md'),
  `# Files NOT in accounting-module-full.zip

These exist in the live repo but are omitted to keep the bundle focused. ChatGPT should treat these as external dependencies.

## Database migrations (not bundled)

- All migrations after \`20260530145814\` (leads, HR payroll, incentives, CRM remediation, test attempts, etc.)
- \`accounting_documents\` table — referenced in \`documentsStore.ts\` but **no migration file in repo yet**
- UPI / incentive / Germany assessment schema migrations
- Lead follow-up, conversion, RLS reload migrations

## Edge functions (not bundled)

- \`send-transactional-email\`, \`notifications-dispatch\`, \`odoo-sync\`, \`odoo-api\`
- UPI pipeline (\`upi-*\`), WhatsApp, telephony, assessment, calendar, offers
- \`verify-document\`, \`process-large-file\`, \`ai-summarize\`, \`ai-help-chat\`

## Frontend (not bundled)

- All CRM pages (\`src/pages/leads/**\`, \`ClientDetail.tsx\`, course finder, etc.)
- HR / payroll / incentive modules
- Portal, assessment, UPI admin UI
- Most \`src/hooks/**\` outside accounting
- \`vite.config.ts\`, \`tailwind.config.ts\`, \`package.json\` (assume standard React + Vite + Supabase stack)

## Shared lib used at runtime but not copied

- \`src/lib/leadBackgroundProfileBridge.ts\` — lead ↔ profile bridge
- Notification email templates under \`supabase/functions/_shared/**\`
- RLS helper RPCs reloaded in later CRM migrations

## Owners / wealth backend

Bundled migrations:
- \`20260518142115_*\` — \`owner_profiles\`, \`financial_accounts\`
- \`20260518220250_*\` — directors / extensions

Delete flows use Supabase client deletes from \`ownersStore.ts\` (cascade on owner delete).
`,
);

execSync(`cd "${STAGING}" && zip -rq "${OUT}" .`, { stdio: 'inherit' });
rmSync(STAGING, { recursive: true, force: true });

const size = statSync(OUT).size;
const count = execSync(`unzip -l "${OUT}" | tail -1`, { encoding: 'utf8' }).trim();
console.log(`\nCreated ${OUT}`);
console.log(`Size: ${(size / 1024).toFixed(0)} KB`);
console.log(count);
console.log(`Removed old zip: ${OLD} (if existed)`);
