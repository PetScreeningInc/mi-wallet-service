import { createHash } from 'node:crypto';
import forge from 'node-forge';
import JSZip from 'jszip';
import { createWalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import type { WalletArtifactStore } from '../../ports/wallet-artifact-store.port';
import { loadApplePassImages } from './apple-wallet.assets';
import { AppleWalletProvider } from './apple-wallet.provider';
import * as signer from './apple-wallet.signer';
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

  it('ships the pass images PassKit requires', () => {
    const images = loadApplePassImages();
    expect(Object.keys(images).sort()).toEqual([
      'icon.png',
      'icon@2x.png',
      'logo.png',
    ]);
    for (const bytes of Object.values(images)) {
      expect(bytes.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    }
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
      'icon.png',
      'icon@2x.png',
      'logo.png',
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
    expect(manifest['icon.png']).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.signature).toBeUndefined();
  });

  it('signs the exact manifest bytes it bundles', async () => {
    const realSign = signer.signAppleManifest;
    const realBundle = signer.bundlePkpass;
    const signedManifests: Buffer[] = [];
    let bundledEntries: Record<string, Buffer> = {};
    const signSpy = jest
      .spyOn(signer, 'signAppleManifest')
      .mockImplementation((manifestBytes, material) => {
        signedManifests.push(manifestBytes);
        return realSign(manifestBytes, material);
      });
    const bundleSpy = jest
      .spyOn(signer, 'bundlePkpass')
      .mockImplementation(async (files) => {
        bundledEntries = files;
        return realBundle(files);
      });

    try {
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
      const result = await provider.generate(
        document,
        template,
        `http://localhost:3000/p/${document.publicId}`,
      );
      expect(result.status).toBe('READY');

      // The manifest is serialized once, and that one Buffer is signed and zipped.
      expect(signedManifests).toHaveLength(1);
      expect(bundledEntries['manifest.json']).toBe(signedManifests[0]);

      const zip = await JSZip.loadAsync(artifacts.items.get(document.id) as Buffer);
      const zippedManifest = await zip
        .file('manifest.json')!
        .async('nodebuffer');
      expect(zippedManifest.equals(signedManifests[0])).toBe(true);

      const signature = await zip.file('signature')!.async('nodebuffer');
      const attributes = signedAttributesOf(signature);
      expect(attributes.get(forge.pki.oids.messageDigest)).toBe(
        createHash('sha1').update(zippedManifest).digest('hex'),
      );
      // Apple requires the S/MIME signing-time attribute on the pass signature.
      expect(attributes.has(forge.pki.oids.signingTime)).toBe(true);
    } finally {
      signSpy.mockRestore();
      bundleSpy.mockRestore();
    }
  });
});

// CMS authenticated attributes by OID; messageDigest maps to its hex digest.
function signedAttributesOf(signature: Buffer): Map<string, string> {
  const message = forge.pkcs7.messageFromAsn1(
    forge.asn1.fromDer(forge.util.createBuffer(signature.toString('binary'))),
  ) as { rawCapture: { authenticatedAttributes?: forge.asn1.Asn1[] } };
  const attributes = new Map<string, string>();
  for (const attribute of message.rawCapture.authenticatedAttributes ?? []) {
    const [type, values] = attribute.value as forge.asn1.Asn1[];
    const [value] = values.value as forge.asn1.Asn1[];
    attributes.set(
      forge.asn1.derToOid(type.value as string),
      forge.util.bytesToHex(value.value as string),
    );
  }
  return attributes;
}
