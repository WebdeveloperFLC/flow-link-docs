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
# Then in Lovable: Sync from GitHub → Publish → approve migrations.
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

Then: Lovable → Sync from GitHub → Publish (approve listed migrations)
EOF
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
DEPLOY_EDGE="${SHIP_DEPLOY_EDGE:-1}"

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

if [[ "$ADD_ALL" == "1" ]]; then
  git add -A
else
  for f in "${FILES[@]}"; do
    if [[ ! -e "$f" ]]; then
      echo "Error: file not found: $f" >&2
      exit 1
    fi
  done
  git add "${FILES[@]}"
fi

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if [[ "$f" == supabase/migrations/* ]]; then
    MIGRATIONS+=("$(basename "$f")")
  fi
  if [[ "$f" == supabase/functions/incentive-calculate-run/* ]]; then
    EDGE_TOUCHED=1
  fi
done < <(git diff --cached --name-only)

if git diff --cached --quiet; then
  echo "Nothing staged to commit (files unchanged or already committed)."
else
  git commit -m "$MSG"
fi

git push -u "$REMOTE" HEAD

if [[ "$DEPLOY_EDGE" == "1" && "$EDGE_TOUCHED" == "1" && -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  CLI="npx --yes supabase@2.105.0"
  echo ""
  echo "→ Deploying edge function incentive-calculate-run…"
  $CLI functions deploy incentive-calculate-run --project-ref "$PROJECT_REF"
fi

echo ""
echo "# Lovable → Sync from GitHub → Publish"
if [[ ${#MIGRATIONS[@]} -gt 0 ]]; then
  for m in "${MIGRATIONS[@]}"; do
    echo "#   migration: $m"
  done
else
  echo "#   (no new migration in this ship — UI / edge only)"
fi
if [[ "$EDGE_TOUCHED" == "1" ]]; then
  echo "#   edge function: incentive-calculate-run (confirm deployed after Publish or CLI above)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
if [[ -n "$LOVABLE_URL" ]]; then
  echo "→ Open Lovable: $LOVABLE_URL"
  command -v open >/dev/null 2>&1 && open "$LOVABLE_URL"
fi
echo "Done. Finish: Lovable → Sync → Publish → approve migrations."
echo "═══════════════════════════════════════════════════════════"
