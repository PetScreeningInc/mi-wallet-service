#!/bin/bash
set -euo pipefail

echo "Initializing localstack (DynamoDB + S3)"

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWSLOCAL=(awslocal --endpoint-url="${LOCALSTACK_ENDPOINT}")
TABLE_NAME="${WALLET_DOCUMENTS_TABLE:-wallet-documents}"
BUCKET_NAME="${WALLET_ARTIFACTS_BUCKET:-wallet-artifacts}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if ! "${AWSLOCAL[@]}" dynamodb describe-table --table-name "${TABLE_NAME}" --region "${REGION}" >/dev/null 2>&1; then
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
else
  echo "Table already exists: ${TABLE_NAME}"
fi

if "${AWSLOCAL[@]}" s3api head-bucket --bucket "${BUCKET_NAME}" >/dev/null 2>&1; then
  echo "Bucket already exists: ${BUCKET_NAME}"
else
  echo "Creating bucket: ${BUCKET_NAME}"
  "${AWSLOCAL[@]}" s3 mb "s3://${BUCKET_NAME}" --region "${REGION}"
  echo "Bucket ready: ${BUCKET_NAME}"
fi
