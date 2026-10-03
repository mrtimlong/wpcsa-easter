#!/usr/bin/env bash
# Lets GitHub Actions deploy without stored AWS keys:
#  - registers GitHub's OIDC identity provider in the account
#  - creates the wpcsa-easter-deploy role, assumable only by pushes to main of this repo
#  - grants it just enough to sync the site to the bucket and invalidate CloudFront
#    (explicitly not data/, where results.json and squads.json live)
# Then stores the role ARN as a GitHub Actions variable. Safe to re-run (updates policies).
set -euo pipefail
source "$(dirname "$0")/config.sh"

GITHUB_REPO="mrtimlong/wpcsa-easter"
ROLE_NAME="wpcsa-easter-deploy"
OIDC_HOST="token.actions.githubusercontent.com"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_ARN="arn:aws:iam::$ACCOUNT_ID:oidc-provider/$OIDC_HOST"

if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  # AWS no longer checks the thumbprint for GitHub, but the API still accepts one.
  aws iam create-open-id-connect-provider --url "https://$OIDC_HOST" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
    --tags "$PROJECT_TAG" >/dev/null
  echo "Created OIDC provider for GitHub Actions"
fi

# GitHub's subject claim may use immutable owner/repo ids (repo:owner@123/name@456), which
# can't be matched by a renamed or re-created repo. Ask GitHub which format this repo uses.
SUB_PREFIX=$(gh api "repos/$GITHUB_REPO/actions/oidc/customization/sub" -q .sub_claim_prefix 2>/dev/null || true)
SUB_PREFIX="${SUB_PREFIX:-repo:$GITHUB_REPO}"

TRUST=$(jq -n --arg oidc "$OIDC_ARN" --arg sub "$SUB_PREFIX:ref:refs/heads/main" '{
  Version: "2012-10-17",
  Statement: [{
    Effect: "Allow",
    Principal: { Federated: $oidc },
    Action: "sts:AssumeRoleWithWebIdentity",
    Condition: {
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": $sub
      }
    }
  }]
}')

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST"
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" \
    --description "GitHub Actions deploy for $GITHUB_REPO (main only)" \
    --max-session-duration 3600 --tags "$PROJECT_TAG" >/dev/null
  echo "Created role $ROLE_NAME"
fi

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" \
  --output text)

aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name deploy-site --policy-document "$(jq -n \
  --arg bucket "arn:aws:s3:::$BUCKET" \
  --arg dist "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID" '{
  Version: "2012-10-17",
  Statement: [
    { Sid: "ListBucket", Effect: "Allow", Action: "s3:ListBucket", Resource: $bucket },
    { Sid: "WriteSite", Effect: "Allow",
      Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], Resource: "\($bucket)/*" },
    { Sid: "NeverTouchData", Effect: "Deny",
      Action: ["s3:PutObject", "s3:DeleteObject"], Resource: "\($bucket)/data/*" },
    { Sid: "FindDistribution", Effect: "Allow", Action: "cloudfront:ListDistributions", Resource: "*" },
    { Sid: "Invalidate", Effect: "Allow", Action: "cloudfront:CreateInvalidation", Resource: $dist }
  ]
}')"

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)
gh variable set AWS_DEPLOY_ROLE_ARN --repo "$GITHUB_REPO" --body "$ROLE_ARN"
echo "Role ready; ARN stored as GitHub Actions variable AWS_DEPLOY_ROLE_ARN on $GITHUB_REPO"
