import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createWalletDocument } from '../../domain/wallet-document';
import { DynamoDbWalletDocumentRepository } from './dynamodb-wallet-document-repository';
import { ensureWalletDocumentsTable } from './ensure-wallet-documents-table';

const tableName = process.env.WALLET_DOCUMENTS_TABLE ?? 'wallet-documents';

async function resolveLocalstackEndpoint(): Promise<string | undefined> {
  const bases = [
    process.env.AWS_ENDPOINT_URL,
    'http://127.0.0.1:4566',
    'http://localhost:4566',
    'http://localstack.lvh.me:4566',
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, ''));

  for (const base of [...new Set(bases)]) {
    try {
      const response = await fetch(`${base}/_localstack/health`);
      if (!response.ok) {
        continue;
      }
      const body = (await response.json()) as {
        services?: Record<string, string>;
      };
      const status = body.services?.dynamodb;
      if (status === 'available' || status === 'running') {
        return base;
      }
    } catch {
      // try next candidate
    }
  }
  return undefined;
}

describe('DynamoDbWalletDocumentRepository', () => {
  let endpoint: string | undefined;
  let repository: DynamoDbWalletDocumentRepository;

  beforeAll(async () => {
    endpoint = await resolveLocalstackEndpoint();
    if (!endpoint) {
      return;
    }
    const lowLevel = new DynamoDBClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
      endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'localstack',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'localstack',
      },
    });
    await ensureWalletDocumentsTable(lowLevel, tableName);
    const client = DynamoDBDocumentClient.from(lowLevel, {
      marshallOptions: { removeUndefinedValues: true },
    });
    repository = new DynamoDbWalletDocumentRepository(client, tableName);
  });

  it('round-trips a document by id and publicId against LocalStack', async () => {
    if (!endpoint) {
      return;
    }
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {
        title: 'Stay with Pico',
        fields: { guest: 'A', dates: 'B', unit: 'C' },
        ownerEmail: 'hidden@example.com',
      },
    });

    await repository.save(document);

    const byId = await repository.findById(document.id);
    const byPublicId = await repository.findByPublicId(document.publicId);

    expect(byId).toEqual(document);
    expect(byPublicId).toEqual(document);
    expect(byId?.data.ownerEmail).toBe('hidden@example.com');
  });

  it('returns null for unknown ids', async () => {
    if (!endpoint) {
      return;
    }
    await expect(
      repository.findById('01UNKNOWNIDNOTFOUND0000000'),
    ).resolves.toBeNull();
    await expect(
      repository.findByPublicId('no-such-public-id'),
    ).resolves.toBeNull();
  });
});
