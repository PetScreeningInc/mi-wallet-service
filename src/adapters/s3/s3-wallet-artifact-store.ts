import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { WalletArtifactStore } from '../../ports/wallet-artifact-store.port';

export class S3WalletArtifactStore implements WalletArtifactStore {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async putApplePass(documentId: string, bytes: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: applePassKey(documentId),
        Body: bytes,
        ContentType: 'application/vnd.apple.pkpass',
        ContentDisposition: 'attachment; filename="wallet.pkpass"',
      }),
    );
  }

  async getApplePass(documentId: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: applePassKey(documentId),
        }),
      );
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) {
        return null;
      }
      return Buffer.from(bytes);
    } catch (error: unknown) {
      if (isMissingKey(error)) {
        return null;
      }
      throw error;
    }
  }
}

export function applePassKey(documentId: string): string {
  return `wallet-artifacts/${documentId}/apple.pkpass`;
}

function isMissingKey(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const record = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    record.name === 'NoSuchKey' ||
    record.name === 'NotFound' ||
    record.Code === 'NoSuchKey' ||
    record.$metadata?.httpStatusCode === 404
  );
}
