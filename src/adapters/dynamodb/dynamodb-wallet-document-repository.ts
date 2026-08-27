import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletDocumentRepository } from '../../ports/wallet-document-repository.port';
import {
  itemToWalletDocument,
  walletDocumentToItem,
  type WalletDocumentItem,
} from './wallet-document.mapper';

export class DynamoDbWalletDocumentRepository
  implements WalletDocumentRepository
{
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(document: WalletDocument): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: walletDocumentToItem(document),
      }),
    );
  }

  async findById(id: string): Promise<WalletDocument | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    );
    if (!result.Item) {
      return null;
    }
    return itemToWalletDocument(result.Item as WalletDocumentItem);
  }

  async findByPublicId(publicId: string): Promise<WalletDocument | null> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'publicId-index',
        KeyConditionExpression: 'publicId = :publicId',
        ExpressionAttributeValues: { ':publicId': publicId },
        Limit: 1,
      }),
    );
    const item = result.Items?.[0];
    if (!item) {
      return null;
    }
    return itemToWalletDocument(item as WalletDocumentItem);
  }
}
