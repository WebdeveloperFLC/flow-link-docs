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

# Performance Hub phases 5C–5F — print every ship so nothing is skipped in Lovable Publish.
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
  echo "YOUR ACTION after ship:"
  echo "  Step 1 — Lovable → Sync from GitHub"
  echo "  Step 2 — Lovable → Publish → approve every pending migration above (not just this ship's file)"
  echo "  Step 3 — Refresh app; batch UAT when module is review-ready (5L = last planned phase slice)"
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
