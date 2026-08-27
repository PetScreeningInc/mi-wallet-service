import type { WalletDocument } from '../domain/wallet-document';
import type { WalletTemplate } from '../domain/wallet-template';

export const WALLET_PROVIDER = Symbol('WalletProvider');

export type GeneratedWallet =
  | { status: 'READY'; url: string }
  | { status: 'FAILED'; error: string };

export interface WalletProvider {
  generate(
    document: WalletDocument,
    template: WalletTemplate,
  ): Promise<GeneratedWallet>;
}
