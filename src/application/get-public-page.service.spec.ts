import * as fs from 'node:fs';
import * as path from 'node:path';
import { Test } from '@nestjs/testing';
import {
  defaultTemplatesDirectory,
  FileTemplateRegistry,
} from '../adapters/templates/file-template-registry';
import {
  createWalletDocument,
  type WalletDocument,
} from '../domain/wallet-document';
import { TEMPLATE_REGISTRY } from '../ports/template-registry.port';
import {
  WALLET_DOCUMENT_REPOSITORY,
  type WalletDocumentRepository,
} from '../ports/wallet-document-repository.port';
import { GetPublicPageService } from './get-public-page.service';

class InMemoryWalletDocumentRepository implements WalletDocumentRepository {
  readonly items = new Map<string, WalletDocument>();

  async save(document: WalletDocument): Promise<void> {
    this.items.set(document.id, document);
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

function demoAData(): Record<string, unknown> {
  const payload = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
        '..',
        '.cursor',
        'skills',
        'con-1309-mock-wallet-call',
        'payloads',
        'demo-a.json',
      ),
      'utf8',
    ),
  ) as { data: Record<string, unknown> };
  return payload.data;
}

describe('GetPublicPageService', () => {
  let service: GetPublicPageService;
  let repository: InMemoryWalletDocumentRepository;

  beforeAll(async () => {
    repository = new InMemoryWalletDocumentRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetPublicPageService,
        {
          provide: WALLET_DOCUMENT_REPOSITORY,
          useValue: repository,
        },
        {
          provide: TEMPLATE_REGISTRY,
          useValue: FileTemplateRegistry.load(defaultTemplatesDirectory()),
        },
      ],
    }).compile();
    service = moduleRef.get(GetPublicPageService);
  });

  beforeEach(() => {
    repository.items.clear();
  });

  it('projects public-flagged fields only', async () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: demoAData(),
    });
    await repository.save(document);

    const result = await service.execute(document.publicId);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.publicData.title).toBe('Stay with Pico');
    expect(result.publicData.ownerEmail).toBeUndefined();
    expect(result.publicData).not.toHaveProperty('id');
  });

  it('returns not found for an unknown publicId', async () => {
    await expect(service.execute('missing-public-id')).resolves.toEqual({
      ok: false,
    });
  });

  it('returns not found when the stored template version is gone', async () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 99,
      data: demoAData(),
    });
    await repository.save(document);

    await expect(service.execute(document.publicId)).resolves.toEqual({
      ok: false,
    });
  });
});
