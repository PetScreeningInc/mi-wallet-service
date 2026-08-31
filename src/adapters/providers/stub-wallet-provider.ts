import { Injectable } from '@nestjs/common';
import type {
  GeneratedWallet,
  GenerateWalletInput,
  WalletProvider,
} from '../../ports/wallet-provider.port';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';

@Injectable()
export class StubWalletProvider implements WalletProvider {
  generate(
    _document: WalletDocument,
    _template: WalletTemplate,
    _input: GenerateWalletInput,
  ): Promise<GeneratedWallet> {
    return Promise.resolve({
      status: 'FAILED',
      error: 'PROVIDER_UNAVAILABLE',
    });
  }
}
