#!/usr/bin/env bash
# Manages /admin logins (committee members who enter results and post announcements).
#
#   infra/admin-users.sh list
#   infra/admin-users.sh add someone@example.com      # emails them a temporary password
#   infra/admin-users.sh resend someone@example.com   # a new invite, if the first one expired (7 days)
#   infra/admin-users.sh disable someone@example.com  # can't sign in any more; keeps them in the audit trail
#   infra/admin-users.sh enable someone@example.com
#
# Email addresses are personal data: don't commit lists of them.
set -euo pipefail
source "$(dirname "$0")/config.sh"
export AWS_REGION="$REGION"

POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 \
  --query "UserPools[?Name=='wpcsa-easter-admins'].Id | [0]" --output text)
[[ "$POOL_ID" != "None" ]] || { echo "No user pool yet: run infra/05-admin-backend.sh" >&2; exit 1; }

ACTION="${1:-list}"
EMAIL="${2:-}"
[[ "$ACTION" == "list" || -n "$EMAIL" ]] || { echo "usage: $0 add|resend|disable|enable <email>" >&2; exit 1; }

case "$ACTION" in
  list)
    aws cognito-idp list-users --user-pool-id "$POOL_ID" \
      --query 'Users[].[Attributes[?Name==`email`].Value | [0], UserStatus, Enabled]' --output table
    ;;
  add)
    aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username "$EMAIL" \
      --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
      --desired-delivery-mediums EMAIL >/dev/null
    aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$EMAIL" --group-name admin
    echo "Added $EMAIL: they'll get an email with a temporary password"
    ;;
  resend)
    aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username "$EMAIL" \
      --message-action RESEND --desired-delivery-mediums EMAIL >/dev/null
    echo "Sent $EMAIL a new invite"
    ;;
  disable)
    aws cognito-idp admin-disable-user --user-pool-id "$POOL_ID" --username "$EMAIL"
    aws cognito-idp admin-user-global-sign-out --user-pool-id "$POOL_ID" --username "$EMAIL"
    echo "Disabled $EMAIL and signed them out everywhere (within the hour on phones already signed in)"
    ;;
  enable)
    aws cognito-idp admin-enable-user --user-pool-id "$POOL_ID" --username "$EMAIL"
    echo "Enabled $EMAIL"
    ;;
  *)
    echo "unknown action $ACTION" >&2
    exit 1
    ;;
esac
