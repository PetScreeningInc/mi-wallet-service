import { Injectable } from '@nestjs/common';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import type {
  GeneratedWallet,
  GenerateWalletInput,
  WalletProvider,
} from '../../ports/wallet-provider.port';
import { GoogleWalletProvider } from './google-wallet.provider';

@Injectable()
export class DispatchWalletProvider implements WalletProvider {
  constructor(private readonly google: GoogleWalletProvider) {}

  generate(
    document: WalletDocument,
    template: WalletTemplate,
    input: GenerateWalletInput,
  ): Promise<GeneratedWallet> {
    if (input.provider !== 'GOOGLE') {
      return Promise.resolve({
        status: 'FAILED',
        error: 'PROVIDER_UNAVAILABLE',
      });
    }
    return this.google.generate(document, template, input.publicUrl);
  }
}
