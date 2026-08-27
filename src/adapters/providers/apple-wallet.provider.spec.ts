import JSZip from 'jszip';
import { createWalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import type { WalletArtifactStore } from '../../ports/wallet-artifact-store.port';
import { AppleWalletProvider } from './apple-wallet.provider';
import { createTestAppleWalletConfig } from './apple-wallet.test-pki';

const template: WalletTemplate = {
  key: 'GENERIC',
  version: 1,
  fields: {
    title: { wallet: true, public: true },
    fields: { wallet: true, public: true },
  },
  schema: {},
};

class MemoryArtifacts implements WalletArtifactStore {
  readonly items = new Map<string, Buffer>();

  async putApplePass(documentId: string, bytes: Buffer): Promise<void> {
    this.items.set(documentId, bytes);
  }

  async getApplePass(documentId: string): Promise<Buffer | null> {
    return this.items.get(documentId) ?? null;
  }
}

describe('AppleWalletProvider', () => {
  it('returns FAILED when Apple credentials are missing', async () => {
    const provider = new AppleWalletProvider(
      {
        passTypeIdentifier: '',
        teamIdentifier: '',
        certificatePem: '',
        privateKeyPem: '',
        wwdrCertificatePem: '',
      },
      new MemoryArtifacts(),
      'http://localhost:3000',
    );
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: { title: 'Stay with Pico', fields: { a: '1', b: '2', c: '3' } },
    });
    await expect(
      provider.generate(document, template, 'http://localhost:3000/p/x'),
    ).resolves.toEqual({
      status: 'FAILED',
      error: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('stores a signed pkpass whose QR is the public URL', async () => {
    const artifacts = new MemoryArtifacts();
    const provider = new AppleWalletProvider(
      createTestAppleWalletConfig(),
      artifacts,
      'http://localhost:3000',
    );
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: { title: 'Stay with Pico', fields: { a: '1', b: '2', c: '3' } },
    });
    const publicUrl = `http://localhost:3000/p/${document.publicId}`;
    const result = await provider.generate(document, template, publicUrl);
    expect(result.status).toBe('READY');
    if (result.status !== 'READY') {
      return;
    }
    expect(result.url).toBe(
      `http://localhost:3000/v1/wallets/${document.id}/apple`,
    );
    const stored = artifacts.items.get(document.id);
    expect(stored).toBeDefined();
    const zip = await JSZip.loadAsync(stored as Buffer);
    expect(Object.keys(zip.files).sort()).toEqual([
      'manifest.json',
      'pass.json',
      'signature',
    ]);
    const passJson = JSON.parse(await zip.file('pass.json')!.async('string')) as {
      barcodes: Array<{ message: string }>;
      serialNumber: string;
    };
    expect(passJson.barcodes[0]?.message).toBe(publicUrl);
    expect(passJson.serialNumber).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const manifest = JSON.parse(
      await zip.file('manifest.json')!.async('string'),
    ) as Record<string, string>;
    expect(manifest['pass.json']).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.signature).toBeUndefined();
  });
});
