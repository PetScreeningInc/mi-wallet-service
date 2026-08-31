import forge from 'node-forge';
import type { AppleWalletConfig } from './apple-wallet.config';

export function createTestAppleWalletConfig(): AppleWalletConfig {
  const caKeys = forge.pki.rsa.generateKeyPair(1024);
  const caCert = forge.pki.createCertificate();
  caCert.publicKey = caKeys.publicKey;
  caCert.serialNumber = '01';
  caCert.validity.notBefore = new Date();
  caCert.validity.notAfter = new Date();
  caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 1);
  const caAttrs = [{ name: 'commonName', value: 'Test WWDR' }];
  caCert.setSubject(caAttrs);
  caCert.setIssuer(caAttrs);
  caCert.setExtensions([{ name: 'basicConstraints', cA: true }]);
  caCert.sign(caKeys.privateKey, forge.md.sha256.create());

  const passKeys = forge.pki.rsa.generateKeyPair(1024);
  const passCert = forge.pki.createCertificate();
  passCert.publicKey = passKeys.publicKey;
  passCert.serialNumber = '02';
  passCert.validity.notBefore = new Date();
  passCert.validity.notAfter = new Date();
  passCert.validity.notAfter.setFullYear(
    passCert.validity.notBefore.getFullYear() + 1,
  );
  const passAttrs = [{ name: 'commonName', value: 'pass.com.example.wallet' }];
  passCert.setSubject(passAttrs);
  passCert.setIssuer(caAttrs);
  passCert.sign(caKeys.privateKey, forge.md.sha256.create());

  return {
    passTypeIdentifier: 'pass.com.example.wallet',
    teamIdentifier: 'TEAM123456',
    certificatePem: forge.pki.certificateToPem(passCert),
    privateKeyPem: forge.pki.privateKeyToPem(passKeys.privateKey),
    wwdrCertificatePem: forge.pki.certificateToPem(caCert),
  };
}
