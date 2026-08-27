import forge from 'node-forge';
import JSZip from 'jszip';

export type AppleSigningMaterial = {
  certificatePem: string;
  privateKeyPem: string;
  wwdrCertificatePem: string;
  privateKeyPassphrase?: string;
};

export function signAppleManifest(
  manifestJson: string,
  material: AppleSigningMaterial,
): Buffer {
  const certificate = forge.pki.certificateFromPem(material.certificatePem);
  const wwdr = forge.pki.certificateFromPem(material.wwdrCertificatePem);
  const privateKey = loadPrivateKey(
    material.privateKeyPem,
    material.privateKeyPassphrase,
  );

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestJson, 'utf8');
  p7.addCertificate(certificate);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key: privateKey as forge.pki.rsa.PrivateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
}

export async function bundlePkpass(files: Record<string, Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, bytes] of Object.entries(files)) {
    zip.file(name, bytes);
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

function loadPrivateKey(
  pem: string,
  passphrase?: string,
): forge.pki.PrivateKey {
  const key = passphrase
    ? forge.pki.decryptRsaPrivateKey(pem, passphrase)
    : forge.pki.privateKeyFromPem(pem);
  if (!key) {
    throw new Error('Invalid Apple pass private key');
  }
  return key;
}
