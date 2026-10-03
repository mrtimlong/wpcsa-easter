#!/usr/bin/env bash
# Requests the TLS certificate for the site (in us-east-1, as CloudFront requires) and prints
# the DNS record to add at the wpcsa.org.za DNS host. Re-run to check validation status.
set -euo pipefail
source "$(dirname "$0")/config.sh"

CERT_ARN=$(aws acm list-certificates --region "$CERT_REGION" \
  --certificate-statuses PENDING_VALIDATION ISSUED \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn | [0]" --output text)

if [[ "$CERT_ARN" == "None" || -z "$CERT_ARN" ]]; then
  CERT_ARN=$(aws acm request-certificate --region "$CERT_REGION" \
    --domain-name "$DOMAIN" --validation-method DNS \
    --idempotency-token wpcsaeaster --tags "$PROJECT_TAG" \
    --query CertificateArn --output text)
  echo "Requested certificate for $DOMAIN"
  # The validation record takes a few seconds to appear.
  sleep 10
fi

echo "Certificate: $CERT_ARN"
aws acm describe-certificate --region "$CERT_REGION" --certificate-arn "$CERT_ARN" \
  --query 'Certificate.{Status:Status,RecordName:DomainValidationOptions[0].ResourceRecord.Name,RecordType:DomainValidationOptions[0].ResourceRecord.Type,RecordValue:DomainValidationOptions[0].ResourceRecord.Value}' \
  --output table
