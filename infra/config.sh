# Shared settings for the infra scripts. Sourced, not executed.

# Locally, use the wpcsa CLI profile. In GitHub Actions, credentials come from the
# OIDC role via environment variables, so no profile is set.
if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
  export AWS_PROFILE="${AWS_PROFILE:-wpcsa}"
fi

REGION="af-south-1"
CERT_REGION="us-east-1" # CloudFront only accepts ACM certificates from us-east-1

DOMAIN="easter.wpcsa.org.za"
BUCKET="wpcsa-easter-2027"
PROJECT_TAG="Key=project,Value=wpcsa-easter"
