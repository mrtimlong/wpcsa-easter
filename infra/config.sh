# Shared settings for the infra scripts. Sourced, not executed.
export AWS_PROFILE="${AWS_PROFILE:-wpcsa}"

REGION="af-south-1"
CERT_REGION="us-east-1" # CloudFront only accepts ACM certificates from us-east-1

DOMAIN="easter.wpcsa.org.za"
BUCKET="wpcsa-easter-2027"
PROJECT_TAG="Key=project,Value=wpcsa-easter"
