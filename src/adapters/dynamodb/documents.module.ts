import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Module } from '@nestjs/common';
import { WALLET_DOCUMENT_REPOSITORY } from '../../ports/wallet-document-repository.port';
import { DynamoDbWalletDocumentRepository } from './dynamodb-wallet-document-repository';
import { DYNAMODB_DOCUMENT_CLIENT } from './dynamodb.tokens';

function createDocumentClient(): DynamoDBDocumentClient {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(endpoint ? { endpoint } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'localstack',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'localstack',
    },
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

@Module({
  providers: [
    {
      provide: DYNAMODB_DOCUMENT_CLIENT,
      useFactory: createDocumentClient,
    },
    {
      provide: WALLET_DOCUMENT_REPOSITORY,
      useFactory: (client: DynamoDBDocumentClient) =>
        new DynamoDbWalletDocumentRepository(
          client,
          process.env.WALLET_DOCUMENTS_TABLE ?? 'wallet-documents',
        ),
      inject: [DYNAMODB_DOCUMENT_CLIENT],
    },
  ],
  exports: [WALLET_DOCUMENT_REPOSITORY],
})
export class DocumentsModule {}
