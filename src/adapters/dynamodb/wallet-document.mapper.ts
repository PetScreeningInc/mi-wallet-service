import type {
  ProviderState,
  WalletDocument,
  WalletDocumentStatus,
} from '../../domain/wallet-document';

export type WalletDocumentItem = {
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
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

const PROVIDER_LEAK_KEYS = [
  'passTypeIdentifier',
  'primaryFields',
  'genericObject',
  'genericClass',
  'textModulesData',
] as const;

export function walletDocumentToItem(document: WalletDocument): WalletDocumentItem {
  const item: WalletDocumentItem = {
    id: document.id,
    publicId: document.publicId,
    templateKey: document.templateKey,
    templateVersion: document.templateVersion,
    data: document.data,
    providers: document.providers,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
  if (document.source !== undefined) {
    item.source = document.source;
  }
  if (document.sourceReference !== undefined) {
    item.sourceReference = document.sourceReference;
  }
  if (document.expiresAt !== undefined) {
    item.expiresAt = document.expiresAt.toISOString();
  }
  return item;
}

export function itemToWalletDocument(item: WalletDocumentItem): WalletDocument {
  const document: WalletDocument = {
    id: item.id,
    publicId: item.publicId,
    templateKey: item.templateKey,
    templateVersion: item.templateVersion,
    data: item.data,
    providers: item.providers ?? {},
    status: item.status,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
  if (item.source !== undefined) {
    document.source = item.source;
  }
  if (item.sourceReference !== undefined) {
    document.sourceReference = item.sourceReference;
  }
  if (item.expiresAt !== undefined) {
    document.expiresAt = new Date(item.expiresAt);
  }
  return document;
}

export function assertNoProviderLeak(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const key of PROVIDER_LEAK_KEYS) {
    if (serialized.includes(key)) {
      throw new Error(`domain item must not contain ${key}`);
    }
  }
}
