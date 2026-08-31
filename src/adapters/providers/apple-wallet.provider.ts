import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PUBLIC_BASE_URL } from '../../application/create-wallet.service';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import {
  WALLET_ARTIFACT_STORE,
  type WalletArtifactStore,
} from '../../ports/wallet-artifact-store.port';
import { loadApplePassImages } from './apple-wallet.assets';
import {
  APPLE_WALLET_CONFIG,
  isAppleWalletConfigured,
  type AppleWalletConfig,
} from './apple-wallet.config';
import {
  buildAppleManifestBytes,
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

    let images: Record<string, Buffer>;
    try {
      images = loadApplePassImages();
    } catch {
      return { status: 'FAILED', error: 'ASSET_UNAVAILABLE' };
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
      const fileEntries: Record<string, Buffer> = {
        'pass.json': passJson,
        ...images,
      };
      const manifestBytes = buildAppleManifestBytes(fileEntries);
      const signature = signAppleManifest(manifestBytes, {
        certificatePem: this.config.certificatePem,
        privateKeyPem: this.config.privateKeyPem,
        wwdrCertificatePem: this.config.wwdrCertificatePem,
      });
      const pkpass = await bundlePkpass({
        ...fileEntries,
        'manifest.json': manifestBytes,
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
