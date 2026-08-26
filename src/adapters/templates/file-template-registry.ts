import * as fs from 'node:fs';
import * as path from 'node:path';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type {
  FieldFlags,
  SchemaIssue,
  TemplateDataValidation,
  WalletTemplate,
} from '../../domain/wallet-template';
import type { TemplateRegistry } from '../../ports/template-registry.port';

type TemplateManifest = {
  key: string;
  version: number;
  current?: boolean;
  fields: Record<string, FieldFlags>;
};

type LoadedTemplate = {
  template: WalletTemplate;
  current: boolean;
  validateFn: ValidateFunction;
};

export function defaultTemplatesDirectory(): string {
  return path.join(__dirname, '..', '..', 'templates');
}

export class FileTemplateRegistry implements TemplateRegistry {
  private readonly byKeyVersion = new Map<string, LoadedTemplate>();
  private readonly currentVersion = new Map<string, number>();

  private constructor(loaded: LoadedTemplate[]) {
    for (const entry of loaded) {
      const id = templateId(entry.template.key, entry.template.version);
      if (this.byKeyVersion.has(id)) {
        throw new Error(`Duplicate template ${id}`);
      }
      this.byKeyVersion.set(id, entry);
    }
    for (const entry of loaded) {
      if (!entry.current) {
        continue;
      }
      const existing = this.currentVersion.get(entry.template.key);
      if (existing !== undefined) {
        throw new Error(
          `Template ${entry.template.key} has more than one current version`,
        );
      }
      this.currentVersion.set(entry.template.key, entry.template.version);
    }
  }

  static load(root: string): FileTemplateRegistry {
    if (!fs.existsSync(root)) {
      throw new Error(`Template catalog not found: ${root}`);
    }

    const ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);

    const loaded: LoadedTemplate[] = [];
    const relatives = fs.readdirSync(root, {
      recursive: true,
      encoding: 'utf8',
    });

    for (const relative of relatives) {
      if (path.basename(relative) !== 'template.json') {
        continue;
      }
      const dir = path.join(root, path.dirname(relative));
      loaded.push(loadOne(dir, ajv));
    }

    if (loaded.length === 0) {
      throw new Error(`No templates found under ${root}`);
    }

    return new FileTemplateRegistry(loaded);
  }

  resolve(key: string, version?: number): WalletTemplate | undefined {
    const resolvedVersion = version ?? this.currentVersion.get(key);
    if (resolvedVersion === undefined) {
      return undefined;
    }
    return this.byKeyVersion.get(templateId(key, resolvedVersion))?.template;
  }

  validate(
    template: WalletTemplate,
    data: unknown,
  ): TemplateDataValidation {
    const loaded = this.byKeyVersion.get(
      templateId(template.key, template.version),
    );
    if (!loaded) {
      throw new Error(
        `Template ${template.key}:v${template.version} is not loaded`,
      );
    }
    const valid = loaded.validateFn(data);
    if (valid) {
      return { ok: true };
    }
    return { ok: false, issues: toIssues(loaded.validateFn.errors ?? []) };
  }
}

function templateId(key: string, version: number): string {
  return `${key}:${version}`;
}

function loadOne(dir: string, ajv: Ajv): LoadedTemplate {
  const manifest = readJson(path.join(dir, 'template.json'));
  const schema = readJson(path.join(dir, 'schema.json'));
  const parsed = parseManifest(manifest, dir);
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    throw new Error(`Invalid schema.json in ${dir}`);
  }
  return {
    current: parsed.current,
    template: {
      key: parsed.key,
      version: parsed.version,
      fields: parsed.fields,
      schema,
    },
    validateFn: ajv.compile(schema),
  };
}

function parseManifest(
  raw: unknown,
  dir: string,
): { key: string; version: number; current: boolean; fields: Record<string, FieldFlags> } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Invalid template.json in ${dir}`);
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.key !== 'string' || record.key.length === 0) {
    throw new Error(`template.json in ${dir} is missing key`);
  }
  if (typeof record.version !== 'number' || !Number.isInteger(record.version)) {
    throw new Error(`template.json in ${dir} is missing integer version`);
  }
  if (typeof record.fields !== 'object' || record.fields === null) {
    throw new Error(`template.json in ${dir} is missing fields`);
  }
  const fields: Record<string, FieldFlags> = {};
  for (const [name, flags] of Object.entries(
    record.fields as Record<string, unknown>,
  )) {
    if (
      typeof flags !== 'object' ||
      flags === null ||
      typeof (flags as FieldFlags).wallet !== 'boolean' ||
      typeof (flags as FieldFlags).public !== 'boolean'
    ) {
      throw new Error(`Invalid field flags for ${name} in ${dir}`);
    }
    fields[name] = {
      wallet: (flags as FieldFlags).wallet,
      public: (flags as FieldFlags).public,
    };
  }
  return {
    key: record.key,
    version: record.version,
    current: record.current === true,
    fields,
  };
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function toIssues(errors: ErrorObject[]): SchemaIssue[] {
  return errors.map((error) => ({
    path: instancePath(error),
    message: error.message ?? error.keyword,
  }));
}

function instancePath(error: ErrorObject): string {
  if (error.instancePath) {
    return error.instancePath;
  }
  if (error.keyword === 'required' && typeof error.params.missingProperty === 'string') {
    return `/${error.params.missingProperty}`;
  }
  return '';
}
