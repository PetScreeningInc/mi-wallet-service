import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import type { WalletDocument } from '../../domain/wallet-document';
import { PUBLIC_BASE_URL } from '../../application/create-wallet.service';
import {
  WALLET_DOCUMENT_REPOSITORY,
  type WalletDocumentRepository,
} from '../../ports/wallet-document-repository.port';
import { GOOGLE_WALLET_CONFIG } from '../providers/google-wallet.config';
import { WalletsModule } from './wallets.module';

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

function demoA(): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
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
  ) as Record<string, unknown>;
}

describe('WalletsController', () => {
  let app: NestFastifyApplication;
  let repository: InMemoryWalletDocumentRepository;

  beforeAll(async () => {
    repository = new InMemoryWalletDocumentRepository();
    const moduleRef = await Test.createTestingModule({
      imports: [WalletsModule],
    })
      .overrideProvider(WALLET_DOCUMENT_REPOSITORY)
      .useValue(repository)
      .overrideProvider(PUBLIC_BASE_URL)
      .useValue('http://localhost:3000')
      .overrideProvider(GOOGLE_WALLET_CONFIG)
      .useValue({
        saEmail: '',
        privateKeyPem: '',
        issuerId: '',
        origins: [],
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repository.items.clear();
  });

  it('returns 201 with id, publicUrl, and stub Apple provider', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/wallets',
      payload: demoA(),
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as {
      id: string;
      publicUrl: string;
      provider: { type: string; status: string; error?: string };
    };
    expect(body.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(body.publicUrl).toMatch(/^http:\/\/localhost:3000\/p\//);
    expect(body.provider).toEqual({
      type: 'APPLE',
      status: 'FAILED',
      error: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('returns 400 with INVALID_PROVIDER before persist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/wallets',
      payload: { ...demoA(), provider: 'BOTH' },
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      code: 'INVALID_PROVIDER',
      message: 'provider must be APPLE or GOOGLE',
    });
    expect(repository.items.size).toBe(0);
  });

  it('returns 201 with FAILED Google when credentials are not configured', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/wallets',
      payload: { ...demoA(), provider: 'GOOGLE' },
    });
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      provider: {
        type: 'GOOGLE',
        status: 'FAILED',
        error: 'PROVIDER_UNAVAILABLE',
      },
    });
  });
});
