import { randomBytes } from 'node:crypto';
import { ulid } from 'ulid';

export type WalletDocumentStatus = 'ACTIVE' | 'EXPIRED';

export type ProviderStatus = 'PENDING' | 'READY' | 'FAILED';

export type ProviderState = {
  status: ProviderStatus;
  url?: string;
  error?: string;
};

export type WalletDocument = {
  id: string;
  publicId: string;
  templateKey: string;
  templateVersion: number;
  source?: string;
  sourceReference?: string;
  data: Record<string, unknown>;
  providers: {
    apple?: ProviderState;
    google?: ProviderState;
  };
  status: WalletDocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
};

export type CreateWalletDocumentInput = {
  templateKey: string;
  templateVersion: number;
  data: Record<string, unknown>;
  source?: string;
  sourceReference?: string;
  expiresAt?: Date;
};

export function createPublicId(): string {
  return randomBytes(16).toString('base64url');
}

export function createWalletDocument(
  input: CreateWalletDocumentInput,
): WalletDocument {
  const now = new Date();
  const document: WalletDocument = {
    id: ulid(),
    publicId: createPublicId(),
    templateKey: input.templateKey,
    templateVersion: input.templateVersion,
    data: input.data,
    providers: {},
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  if (input.source !== undefined) {
    document.source = input.source;
  }
  if (input.sourceReference !== undefined) {
    document.sourceReference = input.sourceReference;
  }
  if (input.expiresAt !== undefined) {
    document.expiresAt = input.expiresAt;
  }
  return document;
}
