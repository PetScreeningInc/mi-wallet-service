import {
  applyProviderState,
  createWalletDocument,
  type WalletDocument,
} from '../domain/wallet-document';
import type { WalletArtifactStore } from '../ports/wallet-artifact-store.port';
import type { WalletDocumentRepository } from '../ports/wallet-document-repository.port';
import { GetApplePassService } from './get-apple-pass.service';

class MemoryDocuments implements WalletDocumentRepository {
  readonly items = new Map<string, WalletDocument>();

  async save(document: WalletDocument): Promise<void> {
    this.items.set(document.id, document);
  }

  async findById(id: string): Promise<WalletDocument | null> {
    return this.items.get(id) ?? null;
  }

  async findByPublicId(publicId: string): Promise<WalletDocument | null> {
    return (
      [...this.items.values()].find((item) => item.publicId === publicId) ??
      null
    );
  }
}

class MemoryArtifacts implements WalletArtifactStore {
  readonly items = new Map<string, Buffer>();

  async putApplePass(documentId: string, bytes: Buffer): Promise<void> {
    this.items.set(documentId, bytes);
  }

  async getApplePass(documentId: string): Promise<Buffer | null> {
    return this.items.get(documentId) ?? null;
  }
}

describe('GetApplePassService', () => {
  it('returns bytes only when Apple is READY and the object exists', async () => {
    const documents = new MemoryDocuments();
    const artifacts = new MemoryArtifacts();
    const service = new GetApplePassService(documents, artifacts);
    const document = applyProviderState(
      createWalletDocument({
        templateKey: 'GENERIC',
        templateVersion: 1,
        data: { title: 'Stay with Pico', fields: { a: '1', b: '2', c: '3' } },
      }),
      'APPLE',
      { status: 'READY', url: 'http://localhost:3000/v1/wallets/x/apple' },
    );
    await documents.save(document);
    const bytes = Buffer.from('pkpass');
    await artifacts.putApplePass(document.id, bytes);

    await expect(service.execute(document.id)).resolves.toEqual({
      ok: true,
      bytes,
    });
  });

  it('returns not found when Apple was never generated', async () => {
    const documents = new MemoryDocuments();
    const artifacts = new MemoryArtifacts();
    const service = new GetApplePassService(documents, artifacts);
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: { title: 'Stay with Pico', fields: { a: '1', b: '2', c: '3' } },
    });
    await documents.save(document);
    await expect(service.execute(document.id)).resolves.toEqual({ ok: false });
  });
});
