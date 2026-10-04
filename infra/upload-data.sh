#!/usr/bin/env bash
# Uploads a data folder (default ./data, the real tournament data, gitignored) to s3://<bucket>/data/
# and refreshes CloudFront. Validates it first. The site picks up changes on the next page load,
# with no deploy needed.
#
#   infra/upload-data.sh               # ./data
#   infra/upload-data.sh sample-data   # the 2025 demo data
#
# Leaves results.json alone: that's written by the results backend. Never uploads images/originals.
set -euo pipefail
source "$(dirname "$0")/config.sh"
cd "$(dirname "$0")/.."

DIR="${1:-data}"
[[ -f "$DIR/tournament.json" ]] || { echo "$DIR/tournament.json not found" >&2; exit 1; }

echo "Checking ${DIR}…"
DATA_DIR="$DIR" npx vitest run src/data/content.test.ts --silent >/dev/null ||
  { echo "Validation failed: run DATA_DIR=$DIR npm run data:check for details" >&2; exit 1; }

# JSON changes during the event (results, schedule tweaks): short cache.
aws s3 sync "$DIR" "s3://$BUCKET/data" --delete --only-show-errors \
  --exclude "*" --include "*.json" --exclude "results.json" \
  --cache-control "public, max-age=60"

# Photos and logos.
aws s3 sync "$DIR" "s3://$BUCKET/data" --delete --only-show-errors \
  --exclude "*.json" --exclude "images/originals/*" --exclude ".*" --exclude "*/.*" --exclude "*.md" \
  --cache-control "public, max-age=3600"

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" \
  --output text)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/data/*" \
  --query Invalidation.Id --output text >/dev/null
echo "Uploaded $DIR to s3://$BUCKET/data/ (CloudFront refreshed)"
