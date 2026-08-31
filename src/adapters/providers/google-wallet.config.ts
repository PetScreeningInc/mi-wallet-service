export const GOOGLE_WALLET_CONFIG = Symbol('GoogleWalletConfig');

export type GoogleWalletConfig = {
  saEmail: string;
  privateKeyPem: string;
  issuerId: string;
  origins: string[];
  logoUrl?: string;
};

export function isGoogleWalletConfigured(config: GoogleWalletConfig): boolean {
  return (
    config.saEmail.trim() !== '' &&
    config.privateKeyPem.trim() !== '' &&
    config.issuerId.trim() !== ''
  );
}

export function googleWalletConfigFromEnv(): GoogleWalletConfig {
  const origins = (process.env.GOOGLE_WALLET_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const config: GoogleWalletConfig = {
    saEmail: process.env.GOOGLE_WALLET_SA_EMAIL ?? '',
    privateKeyPem: (process.env.GOOGLE_WALLET_SA_PRIVATE_KEY ?? '')
      .replace(/\\n/g, '\n')
      .trim(),
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID ?? '',
    origins,
  };
  const logoUrl = process.env.GOOGLE_WALLET_LOGO_URL?.trim();
  if (logoUrl) {
    config.logoUrl = logoUrl;
  }
  return config;
}
