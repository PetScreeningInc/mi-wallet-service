import { createWalletDocument } from '../../domain/wallet-document';
import {
  assertNoProviderLeak,
  itemToWalletDocument,
  walletDocumentToItem,
} from './wallet-document.mapper';

describe('wallet-document mapper', () => {
  it('round-trips dates as ISO strings and keeps GENERIC data including ownerEmail', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {
        title: 'Stay with Pico',
        fields: { guest: 'A', dates: 'B', unit: 'C' },
        ownerEmail: 'hidden@example.com',
      },
    });

    const item = walletDocumentToItem(document);
    expect(item.createdAt).toBe(document.createdAt.toISOString());
    expect(item.updatedAt).toBe(document.updatedAt.toISOString());
    expect(item.data.ownerEmail).toBe('hidden@example.com');
    assertNoProviderLeak(item);

    const restored = itemToWalletDocument(item);
    expect(restored).toEqual(document);
    expect(restored.createdAt).toBeInstanceOf(Date);
  });

  it('omits optional source and expiresAt when unset', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: { title: 'Stay' },
    });
    const item = walletDocumentToItem(document);
    expect(item.source).toBeUndefined();
    expect(item.expiresAt).toBeUndefined();
  });
});
