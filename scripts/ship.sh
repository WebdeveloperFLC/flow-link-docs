#!/usr/bin/env bash
# FLC YOUR ACTION pattern — always ship this way:
#
#   npm run ship -- "feat(performance): Phase 5E — …" -- \
#     supabase/migrations/20260622120000_incentive_platform_phase5e.sql \
#     src/pages/IncentivesAdmin.tsx \
#     docs/INCENTIVE_PHASE5E_DEPLOY.md
#
#   npm run ship -- "fix: hotfix" --all          # git add -A (escape hatch)
#
# Then in Lovable: Sync from GitHub → Publish → approve migrations + edge functions.
# Supabase admin (DB + edge functions) is via Lovable — not Supabase dashboard CLI.
#
# One-time: cp scripts/ship.local.example .ship.local

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .ship.local ]]; then
  # shellcheck disable=SC1091
  source .ship.local
fi

usage() {
  cat <<'EOF'
Usage:
  npm run ship -- "<commit message>" -- <file> [<file> …]
  npm run ship -- "<commit message>" --all

Example (matches deploy doc YOUR ACTION):
  npm run ship -- "feat(performance): Phase 5E — period lock gates" -- \
    supabase/migrations/20260622120000_incentive_platform_phase5e.sql \
    supabase/functions/incentive-calculate-run/index.ts \
    src/pages/IncentivesAdmin.tsx \
    docs/INCENTIVE_PHASE5E_DEPLOY.md

Then: Lovable → Sync from GitHub → Publish (migrations + edge functions)

Supabase is managed in Lovable — ship only pushes to GitHub.
EOF
}

scan_paths_for_hints() {
  MIGRATIONS=()
  EDGE_TOUCHED=0
  local f
  for f in "$@"; do
    [[ -z "$f" ]] && continue
    if [[ "$f" == supabase/migrations/* ]]; then
      MIGRATIONS+=("$(basename "$f")")
    fi
    if [[ "$f" == supabase/functions/incentive-calculate-run/* ]]; then
      EDGE_TOUCHED=1
    fi
    if [[ "$f" == supabase/functions/offer-ai-studio/* ]]; then
      EDGE_TOUCHED=1
    fi
    if [[ "$f" == supabase/functions/offers-lifecycle-tick/* ]]; then
      EDGE_TOUCHED=1
    fi
  done
}

print_performance_migration_checklist() {
  cat <<'EOF'

Performance Hub migrations (Lovable Publish — approve ALL that still show as pending):
  [ ] 20260619120000_incentive_platform_phase5c.sql  — promotion_requests, approvals, unclassified
  [ ] 20260620120000_incentive_platform_phase5d.sql  — telecaller home, lead_converted, publish promo
  [ ] 20260621120000_incentive_runs_unique_scope.sql — runs dedupe
  [ ] 20260622120000_incentive_platform_phase5e.sql  — period lock gates
  [ ] 20260623120000_incentive_platform_phase5f.sql  — enrolment / stage qualifying events
  [ ] 20260624120000_incentive_platform_phase5g.sql  — offers studio dashboard RPC
  [ ] 20260625120000_incentive_platform_phase5h.sql  — AI studio gate + L0 suggestion polish
  [ ] 20260626120000_incentive_platform_phase5i.sql  — calendar, segments, auto-offer rules
  [ ] 20260627120000_incentive_platform_phase5j.sql  — admin unlock/void, wallet preview
  [ ] 20260628120000_incentive_platform_phase5k.sql  — wallet policy CRUD, exception requests
  [ ] 20260629120000_incentive_platform_phase5l.sql  — branch_pool enum, contest prize_settlement
  [ ] 20260629120001_incentive_platform_phase5l_branch_pool.sql  — pool RPCs, O10, wallet impact
  [ ] 20260630120000_incentive_platform_phase5m.sql  — scheme templates, disputes, payroll, FX audit
  [ ] 20260631120000_incentive_platform_phase5n.sql  — wallet W4/W5/W6 policy
  [ ] 20260701120000_incentive_platform_phase5o.sql  — offer automation journeys O7
  [ ] 20260702120000_incentive_platform_phase5p.sql  — split attribution I4, multi-plan stacking I7
  [ ] 20260703120000_incentive_platform_phase5q.sql  — cross-sell journeys, O13 suggestion, I8 poll
  [ ] 20260704120000_incentive_platform_phase5r.sql  — offer A/B tests O11, shared period bar X8
  [ ] 20260705120000_incentive_platform_phase5s.sql  — margin floor O16, waiver guard
  [ ] 20260706120000_incentive_platform_phase5t.sql  — propensity I5, realtime I8
  [ ] 20260707120000_incentive_platform_phase5u.sql  — service floors O16b, WIR lite
  [ ] 20260708120000_incentive_platform_phase5v.sql  — counselor O10 influence, analytics period
  [ ] 20260709120000_incentive_platform_phase5w.sql  — hub readiness gate, batch UAT wrap
  [ ] 20260710120000_incentive_platform_phase5x.sql  — multi-variant A/B O11b
  (UI-only: 6A · 6C · 6D · 6E — no migration)
  [ ] 20260711120000_incentive_platform_phase6b.sql  — director app_role enum (run first)
  [ ] 20260711120001_incentive_platform_phase6b.sql  — director read-only RPCs + RLS

EOF
}

# Phase 1 — document_manifest pilot: regen HTML + SQL when pilot JSON or publish scripts ship.
maybe_publish_service_library_pilot() {
  local run=0
  local f
  for f in "$@"; do
    [[ -z "$f" ]] && continue
    case "$f" in
      content/service-library/canada-spouse-dependent-visitor.json|\
scripts/lib/document-manifest.mjs|\
scripts/lib/document-master-codes.mjs|\
scripts/lib/build-checklist-from-service.mjs)
        run=1
        ;;
    esac
  done
  if [[ "$run" != "1" ]]; then
    return 0
  fi
  echo "→ Regenerating Service Library pilot publish (document_manifest)…"
  node scripts/publish-service-library-pilot.mjs canada-spouse-dependent-visitor
  echo "✓ Pilot publish artifacts regenerated."
}

print_cms_migration_checklist() {
  cat <<'EOF'

CMS additive migrations (Lovable Publish — approve ALL that still show as pending):
  [ ] 20260718120004_incentive_cms_phase2p_payout_threshold.sql  — plan min_payout_threshold + carry
  [ ] 20260718120000_incentive_cms_phase3a_combination_engine.sql  — service_combinations + resolve RPC
  [ ] 20260718120001_incentive_cms_phase3b_offer_eligibility.sql  — offer_eligibility_rules
  [ ] 20260718120002_incentive_cms_phase3c_commercial_profitability.sql  — fn_commercial_profitability
  [ ] 20260718120003_incentive_cms_phase3d_autoapply_policy.sql  — commercial_autoapply_policy

EOF
}

print_hr_payroll_migration_checklist() {
  cat <<'EOF'

HR Payroll migrations (Lovable Publish — approve ALL in order if pending):
  [ ] 20260717120000_hr_payroll_schema.sql
  [ ] 20260717120001_hr_payroll_rls.sql
  [ ] 20260717120002_hr_payroll_functions.sql
  [ ] 20260717120003_hr_payroll_seed_demo.sql
  [ ] 20260717120005_hr_payroll_workflows.sql
  [ ] 20260717120006_hr_payroll_integrations.sql
  [ ] 20260717120007_hr_payroll_full_demo_seed.sql
  [ ] 20260717120008_hr_payroll_demo_rls_bootstrap.sql
  [ ] 20260717120009_hr_payroll_crm_team_integration.sql
  [ ] 20260717120010_hr_payroll_storage.sql
  [ ] 20260717120011_hr_payroll_leave_workflow.sql
  [ ] 20260717120012_hr_payroll_policy_engine_approvals.sql
  [ ] 20260717120013_hr_payroll_lock_export_punch.sql
  [ ] 20260717120014_hr_payroll_overtime_pay.sql
  [ ] 20260717120015_hr_payroll_punch_work_date.sql
  [ ] 20260717120016_hr_payroll_ess_self_profile.sql
  [ ] 20260717120017_hr_payroll_testing_changes.sql  — OT+PT merge, holidays, PT columns

EOF
}

print_sql_reminder() {
  echo ""
  echo "┌──────────────────────────────────────────────────────────────────┐"
  echo "│  npm run ship = GitHub ONLY. It does NOT run SQL on Supabase.   │"
  echo "│  SQL applies only: Lovable → Sync → Publish → approve migrations │"
  echo "│  (Supabase admin is in Lovable — no SQL editor, no CLI token.)  │"
  echo "└──────────────────────────────────────────────────────────────────┘"
  print_performance_migration_checklist
  print_cms_migration_checklist
  print_hr_payroll_migration_checklist
  echo "Full ordered list: docs/LOVABLE_PUBLISH_CHECKLIST.md"
  echo ""
  echo "YOUR ACTION after ship:"
  echo "  Step 1 — Lovable → Sync from GitHub"
  echo "  Step 2 — Lovable → Publish → approve every pending migration above (not just this ship's file)"
  echo "  Step 3 — Refresh app; batch UAT: INCENTIVE_CMS_BATCH_UAT.md + HR_PAYROLL_UAT.md"
  echo ""
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

MSG="$1"
shift

ADD_ALL=0
FILES=()

if [[ $# -eq 0 ]]; then
  echo "Error: list files after -- (or use --all)." >&2
  echo "" >&2
  usage
  exit 1
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ $# -eq 0 ]]; then
  echo "Error: no files after --." >&2
  exit 1
fi

if [[ "$1" == "--all" || "$1" == "-a" ]]; then
  ADD_ALL=1
else
  FILES=("$@")
fi

# Regenerate pilot artifacts before path validation (publish replaces migration timestamp).
if [[ "$ADD_ALL" != "1" ]]; then
  maybe_publish_service_library_pilot "${FILES[@]}"
fi

BRANCH="${SHIP_BRANCH:-$(git branch --show-current)}"
REMOTE="${SHIP_REMOTE:-origin}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-auofttkyosgjhxcbhscw}"
LOVABLE_URL="${LOVABLE_PROJECT_URL:-}"
# Default off: edge functions deploy on Lovable Publish, not Supabase CLI.
DEPLOY_EDGE="${SHIP_DEPLOY_EDGE:-0}"

echo "═══════════════════════════════════════════════════════════"
echo "  YOUR ACTION — GitHub → Lovable → Publish"
echo "  Branch: $BRANCH"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Echo the exact commands (copy-paste record)
echo "git add \\"
if [[ "$ADD_ALL" == "1" ]]; then
  echo "  # (--all)"
else
  for i in "${!FILES[@]}"; do
    sep=" \\"
    [[ $i -eq $((${#FILES[@]} - 1)) ]] && sep=""
    printf "  %s%s\n" "${FILES[$i]}" "$sep"
  done
fi
echo "git commit -m \"${MSG}\""
echo "git push origin HEAD"
echo ""

MIGRATIONS=()
EDGE_TOUCHED=0
HINT_PATHS=()

if [[ "$ADD_ALL" == "1" ]]; then
  while IFS= read -r p; do
    [[ -n "$p" ]] && HINT_PATHS+=("$p")
  done < <(git status --porcelain | awk '{print $NF}')
  scan_paths_for_hints "${HINT_PATHS[@]}"
  git add -A
else
  for f in "${FILES[@]}"; do
    if [[ ! -e "$f" ]]; then
      echo "Error: file not found: $f" >&2
      echo "Tip: use real paths — do not paste template placeholders like YYYYMMDD_phase.sql" >&2
      exit 1
    fi
  done
  scan_paths_for_hints "${FILES[@]}"
  git add "${FILES[@]}"
  git add public/specimens/checklists/canada-spouse-dependent-visitor.html 2>/dev/null || true
  git add supabase/migrations/*_publish_pilot_canada_spouse_dependent_visitor.sql 2>/dev/null || true
fi

# Gate: catch missing imports / ReferenceError in Performance Hub before push
if [[ "${SHIP_SKIP_TESTS:-0}" != "1" ]]; then
  RUN_PH020=0
  if [[ "$ADD_ALL" == "1" ]]; then
    RUN_PH020=1
  else
    for f in "${FILES[@]}"; do
      if [[ "$f" == src/components/performance/* || "$f" == src/pages/Performance* ]]; then
        RUN_PH020=1
        break
      fi
    done
  fi
  if [[ "$RUN_PH020" == "1" ]]; then
    echo "→ Running PH-R-020 performance hub import smoke test…"
    npm run test:regression -- qa/regression/PH-R-020-performance-hub-imports.test.ts
    echo "✓ PH-R-020 passed."
  fi
fi

COMMITTED=0
if git diff --cached --quiet; then
  echo "✓ Nothing new to commit (these files are already on GitHub)."
  echo "  → Skip to Lovable: Sync from GitHub → Publish"
else
  git commit -m "$MSG"
  COMMITTED=1
  echo "✓ Committed."
fi

git push -u "$REMOTE" HEAD
echo "✓ Pushed to $REMOTE/$BRANCH"

# Lovable syncs feature/service-library-nav (not main). Mirror main → Lovable branch after every ship.
LOVABLE_BRANCH="${SHIP_LOVABLE_BRANCH:-feature/service-library-nav}"
if [[ "$BRANCH" == "main" && "$LOVABLE_BRANCH" != "main" ]]; then
  echo "→ Mirroring main to Lovable branch $LOVABLE_BRANCH…"
  git push "$REMOTE" "main:$LOVABLE_BRANCH"
  echo "✓ Pushed to $REMOTE/$LOVABLE_BRANCH (Lovable sync branch)"
fi

if [[ "$EDGE_TOUCHED" == "1" && "$DEPLOY_EDGE" == "1" ]]; then
  tok="${SUPABASE_ACCESS_TOKEN:-}"
  if [[ "$tok" == sbp_* ]]; then
    CLI="npx --yes supabase@2.105.0"
    echo ""
    echo "→ Deploying edge function incentive-calculate-run (CLI)…"
    if ! $CLI functions deploy incentive-calculate-run --project-ref "$PROJECT_REF"; then
      echo "⚠ CLI edge deploy failed — use Lovable → Publish instead." >&2
    fi
  elif [[ -n "$tok" ]]; then
    echo ""
    echo "⚠ Skipping CLI edge deploy (invalid token). Supabase admin is via Lovable → Publish." >&2
  fi
fi

echo ""
echo "# Lovable → Sync from GitHub → Publish"
if [[ ${#MIGRATIONS[@]} -gt 0 ]]; then
  for m in "${MIGRATIONS[@]}"; do
    echo "#   migration: $m"
  done
else
  echo "#   (no migration files in this ship list)"
fi
if [[ "$EDGE_TOUCHED" == "1" ]]; then
  echo "#   edge functions: incentive-calculate-run, offer-ai-studio (deploy on Lovable Publish)"
fi

print_sql_reminder

echo ""
echo "═══════════════════════════════════════════════════════════"
if [[ -n "$LOVABLE_URL" ]]; then
  echo "→ Open Lovable: $LOVABLE_URL"
  command -v open >/dev/null 2>&1 && open "$LOVABLE_URL"
fi
echo "Done. Finish: Lovable → Sync → Publish → approve migrations (see checklist above)."
echo "═══════════════════════════════════════════════════════════"
