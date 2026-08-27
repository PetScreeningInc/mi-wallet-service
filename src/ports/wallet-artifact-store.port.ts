export const WALLET_ARTIFACT_STORE = Symbol('WalletArtifactStore');

export interface WalletArtifactStore {
  putApplePass(documentId: string, bytes: Buffer): Promise<void>;
  getApplePass(documentId: string): Promise<Buffer | null>;
}
