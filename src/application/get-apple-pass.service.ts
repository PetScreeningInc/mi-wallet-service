import { Inject, Injectable } from '@nestjs/common';
import {
  WALLET_ARTIFACT_STORE,
  type WalletArtifactStore,
} from '../ports/wallet-artifact-store.port';
import {
  WALLET_DOCUMENT_REPOSITORY,
  type WalletDocumentRepository,
} from '../ports/wallet-document-repository.port';

export type GetApplePassResult =
  | { ok: true; bytes: Buffer }
  | { ok: false };

@Injectable()
export class GetApplePassService {
  constructor(
    @Inject(WALLET_DOCUMENT_REPOSITORY)
    private readonly documents: WalletDocumentRepository,
    @Inject(WALLET_ARTIFACT_STORE) private readonly artifacts: WalletArtifactStore,
  ) {}

  async execute(id: string): Promise<GetApplePassResult> {
    if (id.trim() === '') {
      return { ok: false };
    }
    const document = await this.documents.findById(id);
    if (document?.providers.apple?.status !== 'READY') {
      return { ok: false };
    }
    const bytes = await this.artifacts.getApplePass(document.id);
    if (!bytes) {
      return { ok: false };
    }
    return { ok: true, bytes };
  }
}
