import * as fs from 'node:fs';
import * as path from 'node:path';
import { Test } from '@nestjs/testing';
import {
  defaultTemplatesDirectory,
  FileTemplateRegistry,
} from '../adapters/templates/file-template-registry';
import { StubWalletProvider } from '../adapters/providers/stub-wallet-provider';
import type { WalletDocument } from '../domain/wallet-document';
import { TEMPLATE_REGISTRY } from '../ports/template-registry.port';
import {
  WALLET_DOCUMENT_REPOSITORY,
  type WalletDocumentRepository,
} from '../ports/wallet-document-repository.port';
import { WALLET_PROVIDER } from '../ports/wallet-provider.port';
import {
  CreateWalletService,
  PUBLIC_BASE_URL,
  parseCreateWalletBody,
} from './create-wallet.service';
import { ValidateWalletDataService } from './validate-wallet-data.service';

class InMemoryWalletDocumentRepository implements WalletDocumentRepository {
  readonly items = new Map<string, WalletDocument>();

  async save(document: WalletDocument): Promise<void> {
    this.items.set(document.id, {
      ...document,
      data: { ...document.data },
      providers: { ...document.providers },
    });
  }

  async findById(id: string): Promise<WalletDocument | null> {
    return this.items.get(id) ?? null;
  }

  async findByPublicId(publicId: string): Promise<WalletDocument | null> {
    return (
      [...this.items.values()].find((item) => item.publicId === publicId) ??
      null
    );
  }
}

function skillPayload(name: string): Record<string, unknown> {
  const file = path.join(
    __dirname,
    '..',
    '..',
    '.cursor',
    'skills',
    'con-1309-mock-wallet-call',
    'payloads',
    name,
  );
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

describe('parseCreateWalletBody', () => {
  it('rejects a missing provider', () => {
    const result = parseCreateWalletBody({
      template: 'GENERIC',
      data: { title: 'x' },
    });
    expect(result).toEqual({ ok: false, code: 'INVALID_PROVIDER' });
  });

  it('rejects a provider that is not APPLE or GOOGLE', () => {
    const result = parseCreateWalletBody({
      template: 'GENERIC',
      provider: 'BOTH',
      data: { title: 'x' },
    });
    expect(result).toEqual({ ok: false, code: 'INVALID_PROVIDER' });
  });
});

describe('CreateWalletService', () => {
  let service: CreateWalletService;
  let repository: InMemoryWalletDocumentRepository;

  beforeAll(async () => {
    repository = new InMemoryWalletDocumentRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: TEMPLATE_REGISTRY,
          useValue: FileTemplateRegistry.load(defaultTemplatesDirectory()),
        },
        ValidateWalletDataService,
        CreateWalletService,
        { provide: WALLET_DOCUMENT_REPOSITORY, useValue: repository },
        { provide: WALLET_PROVIDER, useClass: StubWalletProvider },
        { provide: PUBLIC_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    }).compile();
    service = moduleRef.get(CreateWalletService);
  });

  beforeEach(() => {
    repository.items.clear();
  });

  it('persists CON-1309 demo-a and returns 201 payload with stub FAILED', async () => {
    const result = await service.execute(skillPayload('demo-a.json'));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.provider).toEqual({
      type: 'APPLE',
      status: 'FAILED',
      error: 'PROVIDER_UNAVAILABLE',
    });
    expect(result.publicUrl).toMatch(/^http:\/\/localhost:3000\/p\/[A-Za-z0-9_-]{22}$/);
    expect(result.publicUrl).not.toContain(result.id);

    const stored = await repository.findById(result.id);
    expect(stored?.providers.apple?.status).toBe('FAILED');
    expect(stored?.providers.google).toBeUndefined();
    expect(stored?.source).toBe('con-1309-skill');
    expect(stored?.publicId).not.toBe(result.id);
  });

  it('stores GOOGLE on the google slot only', async () => {
    const payload = { ...skillPayload('demo-b.json'), provider: 'GOOGLE' };
    const result = await service.execute(payload);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.provider.type).toBe('GOOGLE');
    const stored = await repository.findById(result.id);
    expect(stored?.providers.google?.status).toBe('FAILED');
    expect(stored?.providers.apple).toBeUndefined();
  });

  it('does not persist on unknown template', async () => {
    const result = await service.execute({
      template: 'PET_CARD',
      provider: 'APPLE',
      data: { title: 'x', fields: { a: '1', b: '2', c: '3' } },
    });
    expect(result).toMatchObject({
      ok: false,
      code: 'UNKNOWN_TEMPLATE',
    });
    expect(repository.items.size).toBe(0);
  });

  it('does not persist on schema failure', async () => {
    const result = await service.execute({
      template: 'GENERIC',
      provider: 'APPLE',
      data: { subtitle: 'missing title and fields' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('SCHEMA_INVALID');
    expect(result.issues?.length).toBeGreaterThan(0);
    expect(repository.items.size).toBe(0);
  });
});
