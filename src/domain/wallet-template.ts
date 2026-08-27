export type FieldFlags = {
  wallet: boolean;
  public: boolean;
};

export type WalletTemplate = {
  key: string;
  version: number;
  fields: Record<string, FieldFlags>;
  schema: object;
  googleMapping?: Record<string, unknown>;
};

export type SchemaIssue = {
  path: string;
  message: string;
};

export type TemplateDataValidation =
  | { ok: true }
  | { ok: false; issues: SchemaIssue[] };

export function pickPublicData(
  data: Record<string, unknown>,
  fields: Record<string, FieldFlags>,
): Record<string, unknown> {
  return pickByFlag(data, fields, 'public');
}

export function pickWalletData(
  data: Record<string, unknown>,
  fields: Record<string, FieldFlags>,
): Record<string, unknown> {
  return pickByFlag(data, fields, 'wallet');
}

function pickByFlag(
  data: Record<string, unknown>,
  fields: Record<string, FieldFlags>,
  flag: keyof FieldFlags,
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (fields[key]?.[flag] === true) {
      picked[key] = value;
    }
  }
  return picked;
}
