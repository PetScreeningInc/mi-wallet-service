import { createHash } from 'node:crypto';
import { pickWalletData } from '../../domain/wallet-template';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';

export type ApplePassMapping = {
  organizationName: string;
  description: string;
  foregroundColor: string;
  labelColor: string;
  backgroundColor: string;
  barcodeUrl?: string;
};

export type ApplePassField = {
  key: string;
  label: string;
  value: string;
};

export type ApplePassJson = {
  formatVersion: 1;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  foregroundColor: string;
  labelColor: string;
  backgroundColor: string;
  barcodes: Array<{
    format: 'PKBarcodeFormatQR';
    message: string;
    messageEncoding: 'iso-8859-1';
  }>;
  generic: {
    primaryFields: ApplePassField[];
    secondaryFields: ApplePassField[];
    auxiliaryFields: ApplePassField[];
    backFields: ApplePassField[];
  };
};

const DEFAULT_MAPPING: ApplePassMapping = {
  organizationName: 'Passport',
  description: 'Wallet pass',
  foregroundColor: 'rgb(255, 255, 255)',
  labelColor: 'rgb(255, 255, 255)',
  backgroundColor: 'rgb(20, 47, 225)',
};

export function parseAppleMapping(
  raw: Record<string, unknown> | undefined,
): ApplePassMapping {
  if (raw === undefined) {
    return { ...DEFAULT_MAPPING };
  }
  const mapping: ApplePassMapping = {
    organizationName: stringOrDefault(raw.organizationName, DEFAULT_MAPPING.organizationName),
    description: stringOrDefault(raw.description, DEFAULT_MAPPING.description),
    foregroundColor: rgbOrDefault(raw.foregroundColor, DEFAULT_MAPPING.foregroundColor),
    labelColor: rgbOrDefault(raw.labelColor, DEFAULT_MAPPING.labelColor),
    backgroundColor: rgbOrDefault(raw.backgroundColor, DEFAULT_MAPPING.backgroundColor),
  };
  if (typeof raw.barcodeUrl === 'string' && isHttpsUrl(raw.barcodeUrl)) {
    mapping.barcodeUrl = raw.barcodeUrl;
  }
  return mapping;
}

export function buildApplePassJson(input: {
  document: WalletDocument;
  template: WalletTemplate;
  publicUrl: string;
  passTypeIdentifier: string;
  teamIdentifier: string;
  serialNumber: string;
}): ApplePassJson {
  const mapping = parseAppleMapping(input.template.appleMapping);
  const walletData = pickWalletData(input.document.data, input.template.fields);
  const title =
    typeof walletData.title === 'string' && walletData.title.trim() !== ''
      ? walletData.title
      : 'Wallet';
  const subtitle =
    typeof walletData.subtitle === 'string' && walletData.subtitle.trim() !== ''
      ? walletData.subtitle
      : 'Title';

  const extra = fieldsToPassFields(walletData.fields);
  const secondaryFields = extra.slice(0, 2);
  const auxiliaryFields = extra.slice(2, 4);
  const backFields = [...extra.slice(4), ...linksToBackFields(walletData.links)];

  return {
    formatVersion: 1,
    passTypeIdentifier: input.passTypeIdentifier,
    serialNumber: input.serialNumber,
    teamIdentifier: input.teamIdentifier,
    organizationName: mapping.organizationName,
    description: mapping.description,
    foregroundColor: mapping.foregroundColor,
    labelColor: mapping.labelColor,
    backgroundColor: mapping.backgroundColor,
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: mapping.barcodeUrl ?? input.publicUrl,
        messageEncoding: 'iso-8859-1',
      },
    ],
    generic: {
      primaryFields: [{ key: 'title', label: subtitle, value: title }],
      secondaryFields,
      auxiliaryFields,
      backFields,
    },
  };
}

export function sha1Hex(bytes: Buffer): string {
  return createHash('sha1').update(bytes).digest('hex');
}

export function applePassManifest(
  files: Record<string, Buffer>,
): Record<string, string> {
  const manifest: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) {
    manifest[name] = sha1Hex(bytes);
  }
  return manifest;
}

// The only place manifest.json is serialized: the returned Buffer is both signed
// and zipped, so the CMS signature can never drift from the bundled bytes.
export function buildAppleManifestBytes(files: Record<string, Buffer>): Buffer {
  return Buffer.from(`${JSON.stringify(applePassManifest(files))}\n`, 'utf8');
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function rgbOrDefault(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !/^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/.test(value)) {
    return fallback;
  }
  return value;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function fieldsToPassFields(value: unknown): ApplePassField[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const fields: ApplePassField[] = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string' || raw.trim() === '') {
      continue;
    }
    fields.push({ key, label: key, value: raw });
  }
  return fields;
}

function linksToBackFields(value: unknown): ApplePassField[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const fields: ApplePassField[] = [];
  for (const [index, item] of value.entries()) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (typeof record.url !== 'string' || !record.url.startsWith('https://')) {
      continue;
    }
    const label =
      typeof record.label === 'string' && record.label.trim() !== ''
        ? record.label
        : 'Link';
    fields.push({
      key: `link_${index}`,
      label,
      value: record.url,
    });
  }
  return fields;
}
