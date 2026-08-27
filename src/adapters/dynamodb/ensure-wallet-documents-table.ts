import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';

export async function ensureWalletDocumentsTable(
  client: DynamoDBClient,
  tableName: string,
): Promise<void> {
  try {
    await client.send(
      new DescribeTableCommand({ TableName: tableName }),
    );
    return;
  } catch {
    // create below
  }

  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'publicId', AttributeType: 'S' },
        ],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'publicId-index',
            KeySchema: [{ AttributeName: 'publicId', KeyType: 'HASH' }],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      }),
    );
  } catch (error) {
    if (!(error instanceof ResourceInUseException)) {
      throw error;
    }
  }

  await waitUntilTableExists(
    { client, maxWaitTime: 30 },
    { TableName: tableName },
  );
}
