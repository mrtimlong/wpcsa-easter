#!/usr/bin/env bash
# Replaces the announcements saved through /admin with a data folder's announcements.json, and
# republishes. For setting up (e.g. the demo's sample announcements), not during the event: it
# deletes anything posted in /admin. Every change is recorded in the audit trail as "import".
#
#   infra/import-announcements.sh sample-data
set -euo pipefail
source "$(dirname "$0")/config.sh"
cd "$(dirname "$0")/.."

FILE="${1:?usage: $0 <data folder>}/announcements.json"
[[ -f "$FILE" ]] || { echo "$FILE not found" >&2; exit 1; }

PAYLOAD=$(mktemp)
OUT=$(mktemp)
jq '{action: "import-announcements", announcements: .}' "$FILE" >"$PAYLOAD"
aws lambda invoke --region "$REGION" --function-name wpcsa-easter-admin-api \
  --cli-binary-format raw-in-base64-out --payload "fileb://$PAYLOAD" "$OUT" >/dev/null
cat "$OUT"
echo
rm -f "$PAYLOAD" "$OUT"
