import { Inject, Injectable } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import { buildGoogleWalletPayload } from './google-wallet.mapper';
import {
  GOOGLE_WALLET_CONFIG,
  isGoogleWalletConfigured,
  type GoogleWalletConfig,
} from './google-wallet.config';

@Injectable()
export class GoogleWalletProvider {
  constructor(
    @Inject(GOOGLE_WALLET_CONFIG) private readonly config: GoogleWalletConfig,
  ) {}

  generate(
    document: WalletDocument,
    template: WalletTemplate,
    publicUrl: string,
  ): Promise<{ status: 'READY'; url: string } | { status: 'FAILED'; error: string }> {
    if (!isGoogleWalletConfigured(this.config)) {
      return Promise.resolve({
        status: 'FAILED',
        error: 'PROVIDER_UNAVAILABLE',
      });
    }

    const payload = buildGoogleWalletPayload({
      document,
      template,
      publicUrl,
      issuerId: this.config.issuerId,
      logoUrl: this.config.logoUrl,
    });

    try {
      const jwt = sign(
        {
          typ: 'savetowallet',
          origins: this.config.origins,
          payload,
        },
        this.config.privateKeyPem,
        {
          algorithm: 'RS256',
          issuer: this.config.saEmail,
          audience: 'google',
        },
      );
      return Promise.resolve({
        status: 'READY',
        url: `https://pay.google.com/gp/v/save/${jwt}`,
      });
    } catch {
      return Promise.resolve({
        status: 'FAILED',
        error: 'PROVIDER_UNAVAILABLE',
      });
    }
  }
}
