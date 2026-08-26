export type FieldFlags = {
  wallet: boolean;
  public: boolean;
};

export type WalletTemplate = {
  key: string;
  version: number;
  fields: Record<string, FieldFlags>;
  schema: object;
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
  const publicData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (fields[key]?.public === true) {
      publicData[key] = value;
    }
  }
  return publicData;
}
