#!/usr/bin/env bash
# Manages /admin logins. Super users enter results for every sport and post announcements; scorers
# enter results for the sports they're given (one Cognito group per sport: scorer-basketball…).
#
#   infra/admin-users.sh list                                  # everyone, and what they can change
#   infra/admin-users.sh add someone@example.com super         # emails them a temporary password
#   infra/admin-users.sh add someone@example.com volleyball badminton
#   infra/admin-users.sh grant someone@example.com padel       # more sports (or super)
#   infra/admin-users.sh revoke someone@example.com volleyball
#   infra/admin-users.sh resend someone@example.com            # a new invite, if the first one expired (7 days)
#   infra/admin-users.sh disable someone@example.com           # can't sign in any more; keeps them in the audit trail
#   infra/admin-users.sh enable someone@example.com
#
# Grants and revokes apply when their sign-in next renews (within the hour), or straight away if
# they sign out and in again.
#
# Email addresses are personal data: don't commit lists of them.
set -euo pipefail
source "$(dirname "$0")/config.sh"
export AWS_REGION="$REGION"

# Must match Sport in src/data/schema.ts.
SPORTS=(basketball volleyball badminton padel golf)

POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 \
  --query "UserPools[?Name=='wpcsa-easter-admins'].Id | [0]" --output text)
[[ "$POOL_ID" != "None" ]] || { echo "No user pool yet: run infra/05-admin-backend.sh" >&2; exit 1; }

usage() {
  echo "usage: $0 list | add|grant|revoke <email> <super or sports: ${SPORTS[*]}> | resend|disable|enable <email>" >&2
  exit 1
}

ACTION="${1:-list}"
EMAIL="${2:-}"
ROLES=("${@:3}")
[[ "$ACTION" == "list" || -n "$EMAIL" ]] || usage

# The Cognito group for "super" or a sport.
group_for() {
  if [[ "$1" == "super" ]]; then echo admin; return; fi
  for sport in "${SPORTS[@]}"; do
    if [[ "$1" == "$sport" ]]; then echo "scorer-$sport"; return; fi
  done
  echo "Unknown role \"$1\": use super or one of ${SPORTS[*]}" >&2
  exit 1
}

# Checks every role before changing anything, and creates sport groups the first time they're used.
groups_for_roles() {
  [[ ${#ROLES[@]} -gt 0 ]] || usage
  TARGETS=()
  for role in "${ROLES[@]}"; do
    group=$(group_for "$role")
    TARGETS+=("$group")
  done
  for group in "${TARGETS[@]}"; do
    aws cognito-idp get-group --user-pool-id "$POOL_ID" --group-name "$group" >/dev/null 2>&1 ||
      aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name "$group" \
        --description "Enter ${group#scorer-} results" >/dev/null
  done
}

# "super, volleyball" from a user's groups.
roles_of() {
  aws cognito-idp admin-list-groups-for-user --user-pool-id "$POOL_ID" --username "$1" \
    --query 'Groups[].GroupName' --output text </dev/null |
    tr '\t' '\n' | sed -e 's/^admin$/super/' -e 's/^scorer-//' | sort | paste -sd, - | sed 's/,/, /g'
}

case "$ACTION" in
  list)
    aws cognito-idp list-users --user-pool-id "$POOL_ID" \
      --query 'Users[].[Username, Attributes[?Name==`email`].Value | [0], UserStatus, Enabled]' --output text |
      while IFS=$'\t' read -r username email status enabled; do
        roles=$(roles_of "$username")
        printf '%-40s %-22s %-8s %s\n' "$email" "$status" "$([[ "$enabled" == True ]] && echo enabled || echo DISABLED)" \
          "${roles:-(nothing: grant super or a sport)}"
      done
    ;;
  add)
    groups_for_roles
    aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username "$EMAIL" \
      --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
      --desired-delivery-mediums EMAIL >/dev/null
    for group in "${TARGETS[@]}"; do
      aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$EMAIL" --group-name "$group"
    done
    echo "Added $EMAIL ($(roles_of "$EMAIL")): they'll get an email with a temporary password"
    ;;
  grant | revoke)
    groups_for_roles
    for group in "${TARGETS[@]}"; do
      if [[ "$ACTION" == grant ]]; then
        aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$EMAIL" --group-name "$group"
      else
        aws cognito-idp admin-remove-user-from-group --user-pool-id "$POOL_ID" --username "$EMAIL" --group-name "$group"
      fi
    done
    roles=$(roles_of "$EMAIL")
    echo "$EMAIL can now change: ${roles:-nothing} (from their next sign-in renewal, within the hour)"
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
    usage
    ;;
esac
