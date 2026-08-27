import type { WalletDocument } from '../domain/wallet-document';

export const WALLET_DOCUMENT_REPOSITORY = Symbol('WalletDocumentRepository');

export interface WalletDocumentRepository {
  save(document: WalletDocument): Promise<void>;
  findById(id: string): Promise<WalletDocument | null>;
  findByPublicId(publicId: string): Promise<WalletDocument | null>;
}
