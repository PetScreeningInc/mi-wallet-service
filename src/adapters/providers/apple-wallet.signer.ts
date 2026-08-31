import forge from 'node-forge';
import JSZip from 'jszip';

export type AppleSigningMaterial = {
  certificatePem: string;
  privateKeyPem: string;
  wwdrCertificatePem: string;
};

export function signAppleManifest(
  manifestBytes: Buffer,
  material: AppleSigningMaterial,
): Buffer {
  const certificate = forge.pki.certificateFromPem(material.certificatePem);
  const wwdr = forge.pki.certificateFromPem(material.wwdrCertificatePem);
  const privateKey = forge.pki.privateKeyFromPem(material.privateKeyPem);

  const p7 = forge.pkcs7.createSignedData();
  // Sign the manifest bytes verbatim; 'binary' is a byte-for-byte view, not a re-encode.
  p7.content = forge.util.createBuffer(manifestBytes.toString('binary'));
  p7.addCertificate(certificate);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key: privateKey as forge.pki.rsa.PrivateKey,
    certificate,
    // PassKit expects the SHA-1 CMS profile and requires the S/MIME signingTime.
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime },
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
