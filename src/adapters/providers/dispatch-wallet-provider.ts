import { Injectable } from '@nestjs/common';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import type {
  GeneratedWallet,
  GenerateWalletInput,
  WalletProvider,
} from '../../ports/wallet-provider.port';
import { AppleWalletProvider } from './apple-wallet.provider';
import { GoogleWalletProvider } from './google-wallet.provider';

@Injectable()
export class DispatchWalletProvider implements WalletProvider {
  constructor(
    private readonly google: GoogleWalletProvider,
    private readonly apple: AppleWalletProvider,
  ) {}

  generate(
    document: WalletDocument,
    template: WalletTemplate,
    input: GenerateWalletInput,
  ): Promise<GeneratedWallet> {
    if (input.provider === 'GOOGLE') {
      return this.google.generate(document, template, input.publicUrl);
    }
    return this.apple.generate(document, template, input.publicUrl);
  }
}
