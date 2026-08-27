import { createWalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';
import { DispatchWalletProvider } from './dispatch-wallet-provider';
import type { GoogleWalletProvider } from './google-wallet.provider';

const template: WalletTemplate = {
  key: 'GENERIC',
  version: 1,
  fields: {},
  schema: {},
};

describe('DispatchWalletProvider', () => {
  it('leaves Apple on the stub FAILED path', async () => {
    const google = {
      generate: jest.fn(),
    } as unknown as GoogleWalletProvider;
    const dispatch = new DispatchWalletProvider(google);
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {},
    });
    await expect(
      dispatch.generate(document, template, {
        provider: 'APPLE',
        publicUrl: 'http://localhost:3000/p/x',
      }),
    ).resolves.toEqual({
      status: 'FAILED',
      error: 'PROVIDER_UNAVAILABLE',
    });
    expect(google.generate).not.toHaveBeenCalled();
  });

  it('routes Google to the Google adapter', async () => {
    const google = {
      generate: jest.fn().mockResolvedValue({
        status: 'READY',
        url: 'https://pay.google.com/gp/v/save/token',
      }),
    } as unknown as GoogleWalletProvider;
    const dispatch = new DispatchWalletProvider(google);
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {},
    });
    await expect(
      dispatch.generate(document, template, {
        provider: 'GOOGLE',
        publicUrl: 'http://localhost:3000/p/x',
      }),
    ).resolves.toEqual({
      status: 'READY',
      url: 'https://pay.google.com/gp/v/save/token',
    });
    expect(google.generate).toHaveBeenCalledWith(
      document,
      template,
      'http://localhost:3000/p/x',
    );
  });
});
