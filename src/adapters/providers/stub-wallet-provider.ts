import { Injectable } from '@nestjs/common';
import type { GeneratedWallet, WalletProvider } from '../../ports/wallet-provider.port';

@Injectable()
export class StubWalletProvider implements WalletProvider {
  generate(): Promise<GeneratedWallet> {
    return Promise.resolve({
      status: 'FAILED',
      error: 'PROVIDER_UNAVAILABLE',
    });
  }
}
