import { generateKeyPairSync } from 'node:crypto';
import { verify } from 'jsonwebtoken';
import { createWalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import type { GoogleWalletConfig } from './google-wallet.config';
import { GoogleWalletProvider } from './google-wallet.provider';

const template: WalletTemplate = {
  key: 'GENERIC',
  version: 1,
  fields: {
    title: { wallet: true, public: true },
    fields: { wallet: true, public: true },
  },
  schema: {},
};

function testKeys(): { privateKeyPem: string; publicKeyPem: string } {
  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return {
    privateKeyPem: pair.privateKey,
    publicKeyPem: pair.publicKey,
  };
}

describe('GoogleWalletProvider', () => {
  it('returns FAILED when Google credentials are missing', async () => {
    const provider = new GoogleWalletProvider({
      saEmail: '',
      privateKeyPem: '',
      issuerId: '',
      origins: [],
    });
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

  it('returns a Save-to-Wallet URL whose JWT barcode is the public URL', async () => {
    const keys = testKeys();
    const config: GoogleWalletConfig = {
      saEmail: 'wallet@example.iam.gserviceaccount.com',
      privateKeyPem: keys.privateKeyPem,
      issuerId: '338800000000',
      origins: ['http://localhost:3000'],
    };
    const provider = new GoogleWalletProvider(config);
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
    expect(result.url.startsWith('https://pay.google.com/gp/v/save/')).toBe(
      true,
    );
    const jwt = result.url.slice('https://pay.google.com/gp/v/save/'.length);
    const claims = verify(jwt, keys.publicKeyPem, {
      algorithms: ['RS256'],
      issuer: config.saEmail,
      audience: 'google',
    }) as {
      typ?: string;
      payload?: {
        genericObjects?: Array<{ barcode?: { value?: string } }>;
      };
    };
    expect(claims.typ).toBe('savetowallet');
    expect(claims.payload?.genericObjects?.[0]?.barcode?.value).toBe(publicUrl);
  });
});
