import { createWalletDocument, applyProviderState } from './wallet-document';

describe('createWalletDocument', () => {
  it('assigns a ULID id, high-entropy publicId, ACTIVE status, and empty providers', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: { title: 'Stay', fields: { a: '1', b: '2', c: '3' } },
    });

    expect(document.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(document.publicId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(document.publicId).not.toBe(document.id);
    expect(document.status).toBe('ACTIVE');
    expect(document.providers).toEqual({});
    expect(document.createdAt).toBeInstanceOf(Date);
    expect(document.updatedAt).toBeInstanceOf(Date);
  });

  it('does not copy Animal or tagNumber into identity fields', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: { title: 'Stay', fields: { a: '1', b: '2', c: '3' } },
      source: 'platform',
      sourceReference: 'opaque-caller-key',
    });

    expect(document.source).toBe('platform');
    expect(document.sourceReference).toBe('opaque-caller-key');
    expect(document.publicId).not.toBe('opaque-caller-key');
    expect(JSON.stringify(document)).not.toMatch(/passTypeIdentifier|genericObject|tagNumber/);
  });

  it('records exactly one provider slot', () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: { title: 'Stay', fields: { a: '1', b: '2', c: '3' } },
    });
    const withApple = applyProviderState(document, 'APPLE', {
      status: 'FAILED',
      error: 'PROVIDER_UNAVAILABLE',
    });
    expect(withApple.providers.apple?.status).toBe('FAILED');
    expect(withApple.providers.google).toBeUndefined();
  });
});
