import { pickWalletData } from '../../domain/wallet-template';
import type { WalletDocument } from '../../domain/wallet-document';
import type { WalletTemplate } from '../../domain/wallet-template';

export type GooglePassMapping = {
  classSuffix: string;
  hexBackgroundColor: string;
};

export type LocalizedString = {
  defaultValue: { language: string; value: string };
};

export type GoogleGenericObject = {
  id: string;
  classId: string;
  state: 'ACTIVE';
  hexBackgroundColor: string;
  cardTitle: LocalizedString;
  header: LocalizedString;
  barcode: { type: 'QR_CODE'; value: string };
  subheader?: LocalizedString;
  heroImage?: { sourceUri: { uri: string } };
  logo?: { sourceUri: { uri: string } };
  textModulesData?: Array<{ id: string; header: string; body: string }>;
  linksModuleData?: { uris: Array<{ uri: string; description: string }> };
};

export type GoogleWalletJwtPayload = {
  genericClasses: Array<{
    id: string;
    hexBackgroundColor: string;
  }>;
  genericObjects: GoogleGenericObject[];
};

const DEFAULT_MAPPING: GooglePassMapping = {
  classSuffix: 'generic-v1',
  hexBackgroundColor: '#142FE1',
};

export function parseGoogleMapping(
  raw: Record<string, unknown> | undefined,
): GooglePassMapping {
  if (raw === undefined) {
    return { ...DEFAULT_MAPPING };
  }
  const classSuffix =
    typeof raw.classSuffix === 'string' && raw.classSuffix.trim() !== ''
      ? raw.classSuffix.trim()
      : DEFAULT_MAPPING.classSuffix;
  const hexBackgroundColor =
    typeof raw.hexBackgroundColor === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(raw.hexBackgroundColor)
      ? raw.hexBackgroundColor
      : DEFAULT_MAPPING.hexBackgroundColor;
  return { classSuffix, hexBackgroundColor };
}

export function buildGoogleWalletPayload(input: {
  document: WalletDocument;
  template: WalletTemplate;
  publicUrl: string;
  issuerId: string;
  logoUrl?: string;
}): GoogleWalletJwtPayload {
  const mapping = parseGoogleMapping(input.template.googleMapping);
  const walletData = pickWalletData(input.document.data, input.template.fields);
  const classId = `${input.issuerId}.${mapping.classSuffix}`;
  const objectId = `${input.issuerId}.wallet-${input.document.id}`;
  const title =
    typeof walletData.title === 'string' && walletData.title.trim() !== ''
      ? walletData.title
      : 'Wallet';

  const object: GoogleGenericObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    hexBackgroundColor: mapping.hexBackgroundColor,
    cardTitle: localized(title),
    header: localized(title),
    barcode: { type: 'QR_CODE', value: input.publicUrl },
  };

  if (typeof walletData.subtitle === 'string' && walletData.subtitle.trim() !== '') {
    object.subheader = localized(walletData.subtitle);
  }

  const hero = httpsUri(walletData.imageUrl);
  if (hero) {
    object.heroImage = { sourceUri: { uri: hero } };
  }
  if (input.logoUrl !== undefined) {
    const logo = httpsUri(input.logoUrl);
    if (logo) {
      object.logo = { sourceUri: { uri: logo } };
    }
  }

  const textModules = textModulesFromFields(walletData.fields);
  if (textModules.length > 0) {
    object.textModulesData = textModules;
  }
  const links = linksFromData(walletData.links);
  if (links.length > 0) {
    object.linksModuleData = { uris: links };
  }

  return {
    genericClasses: [
      {
        id: classId,
        hexBackgroundColor: mapping.hexBackgroundColor,
      },
    ],
    genericObjects: [object],
  };
}

function localized(value: string): LocalizedString {
  return { defaultValue: { language: 'en-US', value } };
}

function httpsUri(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

function textModulesFromFields(
  value: unknown,
): Array<{ id: string; header: string; body: string }> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const modules: Array<{ id: string; header: string; body: string }> = [];
  for (const [header, body] of Object.entries(value as Record<string, unknown>)) {
    if (typeof body !== 'string' || body.trim() === '') {
      continue;
    }
    const id = header.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 64);
    if (id === '') {
      continue;
    }
    modules.push({ id, header, body });
  }
  return modules;
}

function linksFromData(
  value: unknown,
): Array<{ uri: string; description: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  const links: Array<{ uri: string; description: string }> = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const uri = httpsUri(record.url);
    if (!uri) {
      continue;
    }
    const description =
      typeof record.label === 'string' && record.label.trim() !== ''
        ? record.label
        : uri;
    links.push({ uri, description });
  }
  return links;
}
