import { createWalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import { buildGoogleWalletPayload } from './google-wallet.mapper';

const template: WalletTemplate = {
  key: 'GENERIC',
  version: 1,
  fields: {
    title: { wallet: true, public: true },
    subtitle: { wallet: true, public: true },
    imageUrl: { wallet: true, public: true },
    fields: { wallet: true, public: true },
    links: { wallet: true, public: true },
    ownerEmail: { wallet: false, public: false },
  },
  schema: {},
  googleMapping: {
    classSuffix: 'generic-v1',
    hexBackgroundColor: '#142FE1',
  },
};

describe('buildGoogleWalletPayload', () => {
  it('stamps the public URL as the QR and uses the document id', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {
        title: 'Stay with Pico',
        subtitle: 'Demo reservation card',
        imageUrl: 'https://placehold.co/400x400/png',
        fields: {
          guest: 'Alex Rivera',
          dates: '12–15 Sep',
          unit: 'Cabin 4',
        },
        links: [{ label: 'Details', url: 'https://example.com/stay/demo-a' }],
        ownerEmail: 'not-public@example.com',
      },
    });
    const publicUrl = `http://localhost:3000/p/${document.publicId}`;
    const payload = buildGoogleWalletPayload({
      document,
      template,
      publicUrl,
      issuerId: '338812345678',
    });

    expect(payload.genericClasses[0]?.id).toBe('338812345678.generic-v1');
    expect(payload.genericObjects[0]?.id).toBe(
      `338812345678.wallet-${document.id}`,
    );
    expect(payload.genericObjects[0]?.barcode).toEqual({
      type: 'QR_CODE',
      value: publicUrl,
    });
    expect(payload.genericObjects[0]?.textModulesData).toEqual(
      expect.arrayContaining([
        { id: 'guest', header: 'guest', body: 'Alex Rivera' },
      ]),
    );
    expect(JSON.stringify(payload)).not.toContain('not-public@example.com');
    expect(JSON.stringify(payload)).not.toContain('tagNumber');
    expect(payload.genericObjects[0]?.heroImage?.sourceUri.uri).toBe(
      'https://placehold.co/400x400/png',
    );
    expect(payload.genericObjects[0]?.linksModuleData?.uris[0]).toEqual({
      uri: 'https://example.com/stay/demo-a',
      description: 'Details',
    });
  });

  it('drops non-https images and links', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {
        title: 'Stay with Pico',
        imageUrl: 'javascript:alert(1)',
        fields: { guest: 'A', dates: 'B', unit: 'C' },
        links: [{ label: 'Bad', url: 'javascript:alert(1)' }],
      },
    });
    const payload = buildGoogleWalletPayload({
      document,
      template,
      publicUrl: 'http://localhost:3000/p/abc',
      issuerId: '1',
    });
    expect(payload.genericObjects[0]?.heroImage).toBeUndefined();
    expect(payload.genericObjects[0]?.linksModuleData).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('javascript:');
  });
});
