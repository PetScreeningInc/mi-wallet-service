import { appleWalletConfigFromEnv } from './apple-wallet.config';

const APPLE_ENV_KEYS = [
  'APPLE_PASS_TYPE_ID',
  'APPLE_TEAM_ID',
  'APPLE_PASS_CERTIFICATE',
  'APPLE_PASS_KEY',
  'APPLE_WWDR_CERTIFICATE',
] as const;

describe('appleWalletConfigFromEnv', () => {
  const originalValues = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of APPLE_ENV_KEYS) {
      originalValues.set(key, process.env[key]);
    }
  });

  afterAll(() => {
    for (const [key, value] of originalValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('reads exactly the five supported Apple settings from process.env', () => {
    process.env.APPLE_PASS_TYPE_ID = 'pass.com.example.wallet';
    process.env.APPLE_TEAM_ID = 'TEAM123456';
    process.env.APPLE_PASS_CERTIFICATE = 'pass-certificate';
    process.env.APPLE_PASS_KEY = 'private-key';
    process.env.APPLE_WWDR_CERTIFICATE = 'wwdr-certificate';

    expect(appleWalletConfigFromEnv()).toEqual({
      passTypeIdentifier: 'pass.com.example.wallet',
      teamIdentifier: 'TEAM123456',
      certificatePem: 'pass-certificate',
      privateKeyPem: 'private-key',
      wwdrCertificatePem: 'wwdr-certificate',
    });
  });
});
