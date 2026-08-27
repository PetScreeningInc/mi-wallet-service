import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PUBLIC_BASE_URL } from '../../application/create-wallet.service';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import {
  WALLET_ARTIFACT_STORE,
  type WalletArtifactStore,
} from '../../ports/wallet-artifact-store.port';
import {
  APPLE_WALLET_CONFIG,
  isAppleWalletConfigured,
  type AppleWalletConfig,
} from './apple-wallet.config';
import {
  applePassManifest,
  buildApplePassJson,
} from './apple-wallet.mapper';
import { bundlePkpass, signAppleManifest } from './apple-wallet.signer';

@Injectable()
export class AppleWalletProvider {
  constructor(
    @Inject(APPLE_WALLET_CONFIG) private readonly config: AppleWalletConfig,
    @Inject(WALLET_ARTIFACT_STORE) private readonly artifacts: WalletArtifactStore,
    @Inject(PUBLIC_BASE_URL) private readonly publicBaseUrl: string,
  ) {}

  async generate(
    document: WalletDocument,
    template: WalletTemplate,
    publicUrl: string,
  ): Promise<{ status: 'READY'; url: string } | { status: 'FAILED'; error: string }> {
    if (!isAppleWalletConfigured(this.config)) {
      return { status: 'FAILED', error: 'PROVIDER_UNAVAILABLE' };
    }

    try {
      const pass = buildApplePassJson({
        document,
        template,
        publicUrl,
        passTypeIdentifier: this.config.passTypeIdentifier,
        teamIdentifier: this.config.teamIdentifier,
        serialNumber: randomUUID(),
      });
      const passJson = Buffer.from(`${JSON.stringify(pass)}\n`, 'utf8');
      const files = { 'pass.json': passJson };
      const manifestJson = `${JSON.stringify(applePassManifest(files))}\n`;
      const signature = signAppleManifest(manifestJson, {
        certificatePem: this.config.certificatePem,
        privateKeyPem: this.config.privateKeyPem,
        wwdrCertificatePem: this.config.wwdrCertificatePem,
        privateKeyPassphrase: this.config.privateKeyPassphrase,
      });
      const pkpass = await bundlePkpass({
        ...files,
        'manifest.json': Buffer.from(manifestJson, 'utf8'),
        signature,
      });
      await this.artifacts.putApplePass(document.id, pkpass);
      return {
        status: 'READY',
        url: `${this.publicBaseUrl.replace(/\/$/, '')}/v1/wallets/${document.id}/apple`,
      };
    } catch {
      return { status: 'FAILED', error: 'PROVIDER_UNAVAILABLE' };
    }
  }
}
