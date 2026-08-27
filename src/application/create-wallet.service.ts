import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  applyProviderState,
  createWalletDocument,
  type ProviderState,
  type WalletDocument,
} from '../domain/wallet-document';
import type { SchemaIssue, WalletTemplate } from '../domain/wallet-template';
import {
  WALLET_DOCUMENT_REPOSITORY,
  type WalletDocumentRepository,
} from '../ports/wallet-document-repository.port';
import {
  WALLET_PROVIDER,
  type GeneratedWallet,
  type WalletProvider,
} from '../ports/wallet-provider.port';
import { ValidateWalletDataService } from './validate-wallet-data.service';

export const PUBLIC_BASE_URL = Symbol('PUBLIC_BASE_URL');
export const WALLET_PROVIDER_TIMEOUT_MS = Symbol('WALLET_PROVIDER_TIMEOUT_MS');

export type WalletProviderType = 'APPLE' | 'GOOGLE';

export type CreateWalletErrorCode =
  | 'UNKNOWN_TEMPLATE'
  | 'SCHEMA_INVALID'
  | 'INVALID_PROVIDER'
  | 'INVALID_REQUEST';

export type CreateWalletHttpProvider = {
  type: WalletProviderType;
  status: ProviderState['status'];
  url?: string;
  error?: string;
};

export type CreateWalletResult =
  | {
      ok: true;
      id: string;
      publicUrl: string;
      provider: CreateWalletHttpProvider;
    }
  | {
      ok: false;
      code: CreateWalletErrorCode;
      message: string;
      issues?: SchemaIssue[];
    };

const ERROR_MESSAGES: Record<CreateWalletErrorCode, string> = {
  UNKNOWN_TEMPLATE: 'Unknown template',
  SCHEMA_INVALID: 'data does not match the template schema',
  INVALID_PROVIDER: 'provider must be APPLE or GOOGLE',
  INVALID_REQUEST: 'template, provider, and data are required',
};

type ParsedCreateWallet = {
  template: string;
  templateVersion?: number;
  provider: WalletProviderType;
  data: Record<string, unknown>;
  source?: string;
  sourceReference?: string;
};

export function publicWalletUrl(baseUrl: string, publicId: string): string {
  return `${baseUrl.replace(/\/$/, '')}/p/${publicId}`;
}

export function parseCreateWalletBody(
  body: unknown,
):
  | { ok: true; value: ParsedCreateWallet }
  | { ok: false; code: 'INVALID_PROVIDER' | 'INVALID_REQUEST' } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'INVALID_REQUEST' };
  }
  const record = body as Record<string, unknown>;
  if (typeof record.template !== 'string' || record.template.trim() === '') {
    return { ok: false, code: 'INVALID_REQUEST' };
  }
  if (
    record.data === null ||
    typeof record.data !== 'object' ||
    Array.isArray(record.data)
  ) {
    return { ok: false, code: 'INVALID_REQUEST' };
  }
  if (record.provider !== 'APPLE' && record.provider !== 'GOOGLE') {
    return { ok: false, code: 'INVALID_PROVIDER' };
  }
  if (
    record.templateVersion !== undefined &&
    (!Number.isInteger(record.templateVersion) ||
      (record.templateVersion as number) < 1)
  ) {
    return { ok: false, code: 'INVALID_REQUEST' };
  }
  if (record.source !== undefined && typeof record.source !== 'string') {
    return { ok: false, code: 'INVALID_REQUEST' };
  }
  if (
    record.sourceReference !== undefined &&
    typeof record.sourceReference !== 'string'
  ) {
    return { ok: false, code: 'INVALID_REQUEST' };
  }

  const parsed: ParsedCreateWallet = {
    template: record.template,
    provider: record.provider,
    data: record.data as Record<string, unknown>,
  };
  if (typeof record.templateVersion === 'number') {
    parsed.templateVersion = record.templateVersion;
  }
  if (typeof record.source === 'string') {
    parsed.source = record.source;
  }
  if (typeof record.sourceReference === 'string') {
    parsed.sourceReference = record.sourceReference;
  }
  return { ok: true, value: parsed };
}

function toProviderState(generated: GeneratedWallet): ProviderState {
  if (generated.status === 'READY') {
    return { status: 'READY', url: generated.url };
  }
  return { status: 'FAILED', error: generated.error };
}

function toHttpProvider(
  type: WalletProviderType,
  state: ProviderState,
): CreateWalletHttpProvider {
  const provider: CreateWalletHttpProvider = {
    type,
    status: state.status,
  };
  if (state.url !== undefined) {
    provider.url = state.url;
  }
  if (state.error !== undefined) {
    provider.error = state.error;
  }
  return provider;
}

@Injectable()
export class CreateWalletService {
  private readonly timeoutMs: number;

  constructor(
    private readonly validateWalletData: ValidateWalletDataService,
    @Inject(WALLET_DOCUMENT_REPOSITORY)
    private readonly documents: WalletDocumentRepository,
    @Inject(WALLET_PROVIDER) private readonly walletProvider: WalletProvider,
    @Inject(PUBLIC_BASE_URL) private readonly publicBaseUrl: string,
    @Optional()
    @Inject(WALLET_PROVIDER_TIMEOUT_MS)
    timeoutMs?: number,
  ) {
    this.timeoutMs = timeoutMs ?? 8000;
  }

  async execute(body: unknown): Promise<CreateWalletResult> {
    const parsed = parseCreateWalletBody(body);
    if (!parsed.ok) {
      return {
        ok: false,
        code: parsed.code,
        message: ERROR_MESSAGES[parsed.code],
      };
    }

    const validation = this.validateWalletData.execute({
      template: parsed.value.template,
      templateVersion: parsed.value.templateVersion,
      data: parsed.value.data,
    });
    if (!validation.ok) {
      if (validation.code === 'UNKNOWN_TEMPLATE') {
        return {
          ok: false,
          code: 'UNKNOWN_TEMPLATE',
          message: ERROR_MESSAGES.UNKNOWN_TEMPLATE,
        };
      }
      return {
        ok: false,
        code: 'SCHEMA_INVALID',
        message: ERROR_MESSAGES.SCHEMA_INVALID,
        issues: validation.issues,
      };
    }

    const document = createWalletDocument({
      templateKey: validation.template.key,
      templateVersion: validation.template.version,
      data: parsed.value.data,
      source: parsed.value.source,
      sourceReference: parsed.value.sourceReference,
    });
    await this.documents.save(document);

    const publicUrl = publicWalletUrl(this.publicBaseUrl, document.publicId);
    const generated = await this.generateSafely(
      document,
      validation.template,
      parsed.value.provider,
      publicUrl,
    );
    const state = toProviderState(generated);
    const updated = applyProviderState(
      document,
      parsed.value.provider,
      state,
    );
    await this.documents.save(updated);

    return {
      ok: true,
      id: updated.id,
      publicUrl,
      provider: toHttpProvider(parsed.value.provider, state),
    };
  }

  private async generateSafely(
    document: WalletDocument,
    template: WalletTemplate,
    provider: WalletProviderType,
    publicUrl: string,
  ): Promise<GeneratedWallet> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await withTimeout(
          this.walletProvider.generate(document, template, {
            provider,
            publicUrl,
          }),
          this.timeoutMs,
        );
      } catch {
        if (attempt === 1) {
          return { status: 'FAILED', error: 'PROVIDER_UNAVAILABLE' };
        }
      }
    }
    return { status: 'FAILED', error: 'PROVIDER_UNAVAILABLE' };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('PROVIDER_TIMEOUT'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
