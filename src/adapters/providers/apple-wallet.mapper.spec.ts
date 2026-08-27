import { createWalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import { buildApplePassJson } from './apple-wallet.mapper';

const template: WalletTemplate = {
  key: 'GENERIC',
  version: 1,
  fields: {
    title: { wallet: true, public: true },
    subtitle: { wallet: true, public: true },
    fields: { wallet: true, public: true },
    links: { wallet: true, public: true },
    ownerEmail: { wallet: false, public: false },
  },
  schema: {},
  appleMapping: {
    organizationName: 'Passport',
    description: 'Wallet pass',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(20, 47, 225)',
  },
};

describe('buildApplePassJson', () => {
  it('uses the public URL as the QR and omits ownerEmail', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {
        title: 'Stay with Pico',
        subtitle: 'Demo reservation card',
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
    const pass = buildApplePassJson({
      document,
      template,
      publicUrl,
      passTypeIdentifier: 'pass.com.example.wallet',
      teamIdentifier: 'TEAM123456',
      serialNumber: '11111111-1111-4111-8111-111111111111',
    });
    expect(pass.barcodes[0]?.message).toBe(publicUrl);
    expect(pass.generic.primaryFields[0]?.value).toBe('Stay with Pico');
    expect(pass.generic.secondaryFields.map((field) => field.value)).toEqual([
      'Alex Rivera',
      '12–15 Sep',
    ]);
    expect(JSON.stringify(pass)).not.toContain('not-public@example.com');
    expect(JSON.stringify(pass)).not.toContain('tagNumber');
    expect(pass.serialNumber).toBe('11111111-1111-4111-8111-111111111111');
  });
});
