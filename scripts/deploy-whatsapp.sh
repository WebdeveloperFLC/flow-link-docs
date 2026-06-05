#!/usr/bin/env bash
# Deploy WhatsApp edge functions to auofttkyosgjhxcbhscw
#
# If "Access token not provided" after login, use a dashboard token (no Keychain):
#   1. https://supabase.com/dashboard/account/tokens → Generate new token
#   2. export SUPABASE_ACCESS_TOKEN="sbp_...."
#   3. ./scripts/deploy-whatsapp.sh

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="auofttkyosgjhxcbhscw"
CLI="npx --yes supabase@2.105.0"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Tip: If deploy says 'Access token not provided', run:"
  echo "  export SUPABASE_ACCESS_TOKEN=\"sbp_...\"   # from dashboard/account/tokens"
  echo ""
fi

echo "→ Deploying whatsapp-webhook..."
$CLI functions deploy whatsapp-webhook --project-ref "$PROJECT_REF"

echo "→ Deploying whatsapp-send..."
$CLI functions deploy whatsapp-send --project-ref "$PROJECT_REF"

echo ""
echo "✓ Deployed. Test CRM → WhatsApp → Simulate inbound."
