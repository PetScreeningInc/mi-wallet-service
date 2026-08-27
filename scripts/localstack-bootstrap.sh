#!/bin/bash
set -euo pipefail

echo "Initializing localstack (DynamoDB)"

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWSLOCAL=(awslocal --endpoint-url="${LOCALSTACK_ENDPOINT}")
TABLE_NAME="${WALLET_DOCUMENTS_TABLE:-wallet-documents}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if "${AWSLOCAL[@]}" dynamodb describe-table --table-name "${TABLE_NAME}" --region "${REGION}" >/dev/null 2>&1; then
  echo "Table already exists: ${TABLE_NAME}"
  exit 0
fi

echo "Creating table: ${TABLE_NAME}"
"${AWSLOCAL[@]}" dynamodb create-table \
  --table-name "${TABLE_NAME}" \
  --region "${REGION}" \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=publicId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"publicId-index\",\"KeySchema\":[{\"AttributeName\":\"publicId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]"

echo "Waiting for table: ${TABLE_NAME}"
"${AWSLOCAL[@]}" dynamodb wait table-exists --table-name "${TABLE_NAME}" --region "${REGION}"
echo "Table ready: ${TABLE_NAME}"
