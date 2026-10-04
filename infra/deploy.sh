#!/usr/bin/env bash
# Uploads dist/ to the bucket with the right cache headers and refreshes CloudFront.
# Used locally and by the GitHub Actions deploy workflow. Run `npm run build` first.
# Never touches data/: the tournament data is uploaded with infra/upload-data.sh, and results.json
# is written by the results backend.
set -euo pipefail
source "$(dirname "$0")/config.sh"
cd "$(dirname "$0")/.."

[[ -f dist/index.html ]] || { echo "dist/ is missing: run npm run build" >&2; exit 1; }

# Hashed build assets never change: cache for a year.
aws s3 sync dist/assets "s3://$BUCKET/assets" --delete --only-show-errors \
  --cache-control "public, max-age=31536000, immutable"

# Everything else (index.html, sw.js, manifest, icons) must be revalidated so updates show up.
aws s3 sync dist "s3://$BUCKET" --delete --only-show-errors \
  --exclude "assets/*" --exclude "data/*" \
  --cache-control "public, max-age=0, must-revalidate"

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" \
  --output text)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
  --query Invalidation.Id --output text >/dev/null
echo "Deployed to $DOMAIN (distribution $DIST_ID)"
