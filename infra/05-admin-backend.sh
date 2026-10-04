#!/usr/bin/env bash
# Creates (or updates) the backend for /admin, where committee members enter results and post
# announcements:
#  - DynamoDB table for results, announcements and the audit trail
#  - Cognito user pool for the admin logins (accounts created by Tim only: infra/admin-users.sh)
#  - the admin API Lambda (api/) and its least-privilege role
#  - an HTTP API in front of it that only lets signed-in users through
# Then writes the public settings the site needs (API URL, user pool client) to
# src/generated/backend.json, to commit. Safe to re-run: it also deploys new API code.
set -euo pipefail
source "$(dirname "$0")/config.sh"
cd "$(dirname "$0")/.."
export AWS_REGION="$REGION"

TABLE="wpcsa-easter"
POOL_NAME="wpcsa-easter-admins"
CLIENT_NAME="wpcsa-easter-admin-site"
FUNCTION="wpcsa-easter-admin-api"
ROLE="wpcsa-easter-admin-api"
API_NAME="wpcsa-easter-admin"
LOG_GROUP="/aws/lambda/$FUNCTION"
ORIGINS='["https://'"$DOMAIN"'","http://localhost:5173","http://127.0.0.1:5173"]'
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
TAGS_JSON='{"project":"wpcsa-easter"}'

# --- DynamoDB
if ! aws dynamodb describe-table --table-name "$TABLE" >/dev/null 2>&1; then
  aws dynamodb create-table --table-name "$TABLE" --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --deletion-protection-enabled --tags "$PROJECT_TAG" >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE"
  echo "Created table $TABLE"
fi
aws dynamodb update-continuous-backups --table-name "$TABLE" \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true >/dev/null
TABLE_ARN=$(aws dynamodb describe-table --table-name "$TABLE" --query Table.TableArn --output text)

# --- Cognito: email + password, no self sign-up, invite emails link to /admin
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 \
  --query "UserPools[?Name=='$POOL_NAME'].Id | [0]" --output text)
INVITE='{
  "EmailSubject": "Your SACSA Easter Tournament admin login",
  "EmailMessage": "<p>You can now enter results and post announcements for the SACSA Easter Tournament.</p><p>Go to <a href=\"https://'"$DOMAIN"'/admin\">https://'"$DOMAIN"'/admin</a> and sign in with:</p><p>Email: {username}<br>Temporary password: {####}</p><p>You will be asked to choose your own password. The temporary one expires in 7 days.</p>"
}'
POLICY='PasswordPolicy={MinimumLength=10,RequireUppercase=false,RequireLowercase=false,RequireNumbers=false,RequireSymbols=false,TemporaryPasswordValidityDays=7}'
if [[ "$POOL_ID" == "None" ]]; then
  POOL_ID=$(aws cognito-idp create-user-pool --pool-name "$POOL_NAME" \
    --user-pool-tier LITE --deletion-protection ACTIVE \
    --username-attributes email --auto-verified-attributes email \
    --policies "$POLICY" \
    --admin-create-user-config "{\"AllowAdminCreateUserOnly\":true,\"InviteMessageTemplate\":$INVITE}" \
    --account-recovery-setting 'RecoveryMechanisms=[{Priority=1,Name=verified_email}]' \
    --user-pool-tags "$TAGS_JSON" --query UserPool.Id --output text)
  echo "Created user pool $POOL_ID"
else
  aws cognito-idp update-user-pool --user-pool-id "$POOL_ID" \
    --user-pool-tier LITE --deletion-protection ACTIVE --auto-verified-attributes email \
    --policies "$POLICY" \
    --admin-create-user-config "{\"AllowAdminCreateUserOnly\":true,\"InviteMessageTemplate\":$INVITE}" \
    --account-recovery-setting 'RecoveryMechanisms=[{Priority=1,Name=verified_email}]' \
    --user-pool-tags "$TAGS_JSON"
fi
aws cognito-idp get-group --user-pool-id "$POOL_ID" --group-name admin >/dev/null 2>&1 ||
  aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name admin \
    --description "Enter results and post announcements" >/dev/null

# The site signs in with email + password straight to Cognito (no hosted login page, so the login
# form can be bilingual). Signed in for 30 days on a phone; ID tokens last an hour and are refreshed.
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" \
  --query "UserPoolClients[?ClientName=='$CLIENT_NAME'].ClientId | [0]" --output text)
CLIENT_SETTINGS=(--explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
  --prevent-user-existence-errors ENABLED --enable-token-revocation
  --token-validity-units 'AccessToken=hours,IdToken=hours,RefreshToken=days'
  --access-token-validity 1 --id-token-validity 1 --refresh-token-validity 30)
if [[ "$CLIENT_ID" == "None" ]]; then
  CLIENT_ID=$(aws cognito-idp create-user-pool-client --user-pool-id "$POOL_ID" --client-name "$CLIENT_NAME" \
    --no-generate-secret "${CLIENT_SETTINGS[@]}" --query UserPoolClient.ClientId --output text)
  echo "Created app client $CLIENT_ID"
else
  aws cognito-idp update-user-pool-client --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
    --client-name "$CLIENT_NAME" "${CLIENT_SETTINGS[@]}" >/dev/null
fi

# --- Lambda role: this table, the published data it checks against, and the two files it writes
TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
if ! aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document "$TRUST" \
    --description "Admin API Lambda for $DOMAIN" --tags "$PROJECT_TAG" >/dev/null
  echo "Created role $ROLE"
  NEW_ROLE=1
fi
aws iam put-role-policy --role-name "$ROLE" --policy-name admin-api --policy-document "$(jq -n \
  --arg table "$TABLE_ARN" --arg bucket "arn:aws:s3:::$BUCKET" \
  --arg logs "arn:aws:logs:$REGION:$ACCOUNT_ID:log-group:$LOG_GROUP:*" '{
  Version: "2012-10-17",
  Statement: [
    { Effect: "Allow", Action: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      Resource: $table },
    { Effect: "Allow", Action: "s3:GetObject",
      Resource: ["tournament", "fixtures", "competitions"] | map("\($bucket)/data/\(.).json") },
    { Effect: "Allow", Action: "s3:PutObject",
      Resource: ["results", "announcements"] | map("\($bucket)/data/\(.).json") },
    { Effect: "Allow", Action: ["logs:CreateLogStream", "logs:PutLogEvents"], Resource: $logs }
  ]
}')"
ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text)

# --- Lambda
if ! aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" \
  --query "logGroups[?logGroupName=='$LOG_GROUP'] | [0].logGroupName" --output text | grep -q "$LOG_GROUP"; then
  aws logs create-log-group --log-group-name "$LOG_GROUP" --tags project=wpcsa-easter
fi
aws logs put-retention-policy --log-group-name "$LOG_GROUP" --retention-in-days 90

npm run --silent api:build
ZIP=$(mktemp -d)/api.zip
(cd api/dist && zip -qr "$ZIP" .)
if ! aws lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1; then
  [[ -n "${NEW_ROLE:-}" ]] && sleep 10 # a new role takes a few seconds before Lambda can use it
  aws lambda create-function --function-name "$FUNCTION" --runtime nodejs24.x --architectures arm64 \
    --handler index.handler --role "$ROLE_ARN" --zip-file "fileb://$ZIP" \
    --memory-size 512 --timeout 15 \
    --environment "Variables={TABLE=$TABLE,BUCKET=$BUCKET}" \
    --tags project=wpcsa-easter >/dev/null
  echo "Created function $FUNCTION"
else
  aws lambda update-function-code --function-name "$FUNCTION" --zip-file "fileb://$ZIP" >/dev/null
  aws lambda wait function-updated-v2 --function-name "$FUNCTION"
  aws lambda update-function-configuration --function-name "$FUNCTION" --runtime nodejs24.x \
    --memory-size 512 --timeout 15 --environment "Variables={TABLE=$TABLE,BUCKET=$BUCKET}" >/dev/null
  echo "Updated function $FUNCTION"
fi
rm -f "$ZIP"
aws lambda wait function-updated-v2 --function-name "$FUNCTION"
FUNCTION_ARN=$(aws lambda get-function --function-name "$FUNCTION" --query Configuration.FunctionArn --output text)

# --- HTTP API: every route needs a valid ID token from the user pool; CORS for the site only
CORS=$(jq -n --argjson origins "$ORIGINS" \
  '{AllowOrigins: $origins, AllowMethods: ["GET", "PUT", "DELETE"], AllowHeaders: ["authorization", "content-type"], MaxAge: 3600}')
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId | [0]" --output text)
if [[ "$API_ID" == "None" ]]; then
  API_ID=$(aws apigatewayv2 create-api --name "$API_NAME" --protocol-type HTTP \
    --cors-configuration "$CORS" --tags project=wpcsa-easter --query ApiId --output text)
  echo "Created API $API_ID"
else
  aws apigatewayv2 update-api --api-id "$API_ID" --cors-configuration "$CORS" >/dev/null
fi

ISSUER="https://cognito-idp.$REGION.amazonaws.com/$POOL_ID"
AUTH_ID=$(aws apigatewayv2 get-authorizers --api-id "$API_ID" \
  --query "Items[?Name=='cognito'].AuthorizerId | [0]" --output text)
if [[ "$AUTH_ID" == "None" ]]; then
  AUTH_ID=$(aws apigatewayv2 create-authorizer --api-id "$API_ID" --name cognito --authorizer-type JWT \
    --identity-source '$request.header.Authorization' \
    --jwt-configuration "Audience=$CLIENT_ID,Issuer=$ISSUER" --query AuthorizerId --output text)
fi

INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id "$API_ID" \
  --query "Items[?IntegrationUri=='$FUNCTION_ARN'].IntegrationId | [0]" --output text)
if [[ "$INTEGRATION_ID" == "None" ]]; then
  INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id "$API_ID" --integration-type AWS_PROXY \
    --integration-uri "$FUNCTION_ARN" --payload-format-version 2.0 --query IntegrationId --output text)
fi

ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$API_ID" \
  --query "Items[?RouteKey=='ANY /{proxy+}'].RouteId | [0]" --output text)
if [[ "$ROUTE_ID" == "None" ]]; then
  aws apigatewayv2 create-route --api-id "$API_ID" --route-key 'ANY /{proxy+}' \
    --authorization-type JWT --authorizer-id "$AUTH_ID" --target "integrations/$INTEGRATION_ID" >/dev/null
fi

# Browsers check CORS with an OPTIONS request that carries no token. Without this route it would hit the
# ANY route above and be refused (401); with no integration, API Gateway answers it from the CORS settings.
PREFLIGHT_ID=$(aws apigatewayv2 get-routes --api-id "$API_ID" \
  --query "Items[?RouteKey=='OPTIONS /{proxy+}'].RouteId | [0]" --output text)
if [[ "$PREFLIGHT_ID" == "None" ]]; then
  aws apigatewayv2 create-route --api-id "$API_ID" --route-key 'OPTIONS /{proxy+}' --authorization-type NONE >/dev/null
fi

# A handful of scorers: 10 requests a second (bursts of 20) is plenty and caps any abuse.
if ! aws apigatewayv2 get-stage --api-id "$API_ID" --stage-name '$default' >/dev/null 2>&1; then
  aws apigatewayv2 create-stage --api-id "$API_ID" --stage-name '$default' --auto-deploy \
    --default-route-settings ThrottlingBurstLimit=20,ThrottlingRateLimit=10 >/dev/null
else
  aws apigatewayv2 update-stage --api-id "$API_ID" --stage-name '$default' \
    --default-route-settings ThrottlingBurstLimit=20,ThrottlingRateLimit=10 >/dev/null
fi

aws lambda add-permission --function-name "$FUNCTION" --statement-id api-gateway \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*" >/dev/null 2>&1 || true

API_URL=$(aws apigatewayv2 get-api --api-id "$API_ID" --query ApiEndpoint --output text)

# --- Settings for the site (public values: they're visible to anyone who opens /admin anyway)
jq -n --arg region "$REGION" --arg clientId "$CLIENT_ID" --arg api "$API_URL" \
  '{region: $region, clientId: $clientId, api: $api}' >src/generated/backend.json
echo "Admin backend ready: API $API_URL, user pool $POOL_ID (src/generated/backend.json updated)"
