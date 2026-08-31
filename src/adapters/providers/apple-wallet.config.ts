import { readFileSync, existsSync } from 'node:fs';

export const APPLE_WALLET_CONFIG = Symbol('AppleWalletConfig');

export type AppleWalletConfig = {
  passTypeIdentifier: string;
  teamIdentifier: string;
  certificatePem: string;
  privateKeyPem: string;
  wwdrCertificatePem: string;
};

export function isAppleWalletConfigured(config: AppleWalletConfig): boolean {
  return (
    config.passTypeIdentifier.trim() !== '' &&
    config.teamIdentifier.trim() !== '' &&
    config.certificatePem.trim() !== '' &&
    config.privateKeyPem.trim() !== '' &&
    config.wwdrCertificatePem.trim() !== ''
  );
}

export function appleWalletConfigFromEnv(): AppleWalletConfig {
  return {
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID ?? '',
    teamIdentifier: process.env.APPLE_TEAM_ID ?? '',
    certificatePem: readPem(process.env.APPLE_PASS_CERTIFICATE ?? ''),
    privateKeyPem: readPem(process.env.APPLE_PASS_KEY ?? ''),
    wwdrCertificatePem: readPem(process.env.APPLE_WWDR_CERTIFICATE ?? ''),
  };
}

function readPem(value: string): string {
  const trimmed = value.replace(/\\n/g, '\n').trim();
  if (trimmed === '') {
    return '';
  }
  if (trimmed.includes('-----BEGIN')) {
    return trimmed;
  }
  if (existsSync(trimmed)) {
    return readFileSync(trimmed, 'utf8').replace(/\\n/g, '\n').trim();
  }
  return trimmed;
}
