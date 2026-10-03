#!/usr/bin/env bash
# Creates the CloudFront distribution in front of the private bucket:
#  - Origin Access Control so only this distribution can read the bucket
#  - a CloudFront Function that serves index.html for app routes (/fixtures, /admin…)
#  - the ACM certificate for the custom domain
# Then prints the CNAME record to add in Cloudflare. Safe to re-run (skips what exists).
# Changes to an existing distribution are made in the console or with update-distribution.
set -euo pipefail
source "$(dirname "$0")/config.sh"

# AWS managed policies
CACHE_POLICY_ID="658327ea-f89d-4fab-a63d-7e88639e58f6"   # Managed-CachingOptimized (honours Cache-Control)
HEADERS_POLICY_ID="67f7725c-6f97-4210-82d7-5512b31e9d03" # Managed-SecurityHeadersPolicy

OAC_NAME="$BUCKET-oac"
FUNCTION_NAME="wpcsa-easter-spa-rewrite"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

CERT_ARN=$(aws acm list-certificates --region "$CERT_REGION" --certificate-statuses ISSUED \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn | [0]" --output text)
if [[ "$CERT_ARN" == "None" ]]; then
  echo "No issued certificate for $DOMAIN yet: run 02-certificate.sh and wait for ISSUED" >&2
  exit 1
fi

# --- Origin Access Control
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id | [0]" --output text)
if [[ "$OAC_ID" == "None" ]]; then
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    "Name=$OAC_NAME,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)
  echo "Created origin access control $OAC_ID"
fi

# --- SPA rewrite function: paths without a file extension get index.html
FUNCTION_CODE=$(mktemp)
cat >"$FUNCTION_CODE" <<'JS'
function handler(event) {
  var request = event.request;
  var last = request.uri.split('/').pop();
  if (last.indexOf('.') === -1) request.uri = '/index.html';
  return request;
}
JS
if ! aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE >/dev/null 2>&1; then
  ETAG=$(aws cloudfront create-function --name "$FUNCTION_NAME" \
    --function-config "Comment=Serve index.html for app routes,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$FUNCTION_CODE" --query ETag --output text)
  aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG" >/dev/null
  echo "Created and published function $FUNCTION_NAME"
fi
rm -f "$FUNCTION_CODE"
FUNCTION_ARN=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE \
  --query FunctionSummary.FunctionMetadata.FunctionARN --output text)

# --- Distribution
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" \
  --output text)
if [[ "$DIST_ID" == "None" ]]; then
  CONFIG=$(jq -n \
    --arg ref "wpcsa-easter-$(date +%s)" \
    --arg domain "$DOMAIN" \
    --arg origin "$BUCKET.s3.$REGION.amazonaws.com" \
    --arg oac "$OAC_ID" \
    --arg cache "$CACHE_POLICY_ID" \
    --arg headers "$HEADERS_POLICY_ID" \
    --arg fn "$FUNCTION_ARN" \
    --arg cert "$CERT_ARN" '{
      CallerReference: $ref,
      Comment: "SACSA Easter Tournament app",
      Enabled: true,
      Aliases: { Quantity: 1, Items: [$domain] },
      DefaultRootObject: "index.html",
      Origins: { Quantity: 1, Items: [{
        Id: "s3", DomainName: $origin, OriginAccessControlId: $oac,
        S3OriginConfig: { OriginAccessIdentity: "" }
      }]},
      DefaultCacheBehavior: {
        TargetOriginId: "s3",
        ViewerProtocolPolicy: "redirect-to-https",
        AllowedMethods: { Quantity: 2, Items: ["GET", "HEAD"],
          CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] } },
        Compress: true,
        CachePolicyId: $cache,
        ResponseHeadersPolicyId: $headers,
        FunctionAssociations: { Quantity: 1, Items: [{ EventType: "viewer-request", FunctionARN: $fn }] }
      },
      ViewerCertificate: {
        ACMCertificateArn: $cert, SSLSupportMethod: "sni-only", MinimumProtocolVersion: "TLSv1.2_2021"
      },
      PriceClass: "PriceClass_200",
      HttpVersion: "http2and3",
      IsIPV6Enabled: true
    }')
  DIST_ID=$(aws cloudfront create-distribution-with-tags --distribution-config-with-tags \
    "$(jq -n --argjson config "$CONFIG" \
      '{DistributionConfig: $config, Tags: {Items: [{Key: "project", Value: "wpcsa-easter"}]}}')" \
    --query Distribution.Id --output text)
  echo "Created distribution $DIST_ID"
fi

# --- Bucket policy: only this distribution may read objects
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(jq -n \
  --arg bucket "$BUCKET" --arg dist "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID" '{
    Version: "2012-10-17",
    Statement: [{
      Sid: "AllowCloudFrontRead",
      Effect: "Allow",
      Principal: { Service: "cloudfront.amazonaws.com" },
      Action: "s3:GetObject",
      Resource: "arn:aws:s3:::\($bucket)/*",
      Condition: { StringEquals: { "AWS:SourceArn": $dist } }
    }]
  }')"

aws cloudfront get-distribution --id "$DIST_ID" \
  --query 'Distribution.{Id:Id,Status:Status,CloudFrontDomain:DomainName}' --output table
echo
echo "Add in Cloudflare (DNS only, grey cloud):"
echo "  CNAME  easter  ->  $(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)"
