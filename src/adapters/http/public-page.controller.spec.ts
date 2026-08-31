import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { createWalletDocument } from '../../domain/wallet-document';
import type { WalletDocument } from '../../domain/wallet-document';
import {
  WALLET_DOCUMENT_REPOSITORY,
  type WalletDocumentRepository,
} from '../../ports/wallet-document-repository.port';
import { PublicPageModule } from './public-page.module';

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

describe('PublicPageController', () => {
  let app: NestFastifyApplication;
  let repository: InMemoryWalletDocumentRepository;

  beforeAll(async () => {
    repository = new InMemoryWalletDocumentRepository();
    const moduleRef = await Test.createTestingModule({
      imports: [PublicPageModule],
    })
      .overrideProvider(WALLET_DOCUMENT_REPOSITORY)
      .useValue(repository)
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

  it('returns HTML for public-flagged GENERIC slots without auth', async () => {
    const document = createWalletDocument({
      templateKey: 'GENERIC',
      templateVersion: 1,
      data: {
        title: 'Stay with Pico',
        subtitle: 'Demo reservation card',
        imageUrl: 'https://placehold.co/400x400/png',
        fields: {
          guest: 'Alex Rivera',
          dates: '12–15 Sep',
          unit: 'Cabin 4',
        },
        links: [{ label: 'Details', url: 'https://example.com/stay/demo-a' }],
        ownerEmail: 'not-public@example.com',
      },
    });
    await repository.save(document);

    const response = await app.inject({
      method: 'GET',
      url: `/p/${document.publicId}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.body).toContain('Stay with Pico');
    expect(response.body).toContain('Alex Rivera');
    expect(response.body).toContain('Cabin 4');
    expect(response.body).toContain('https://example.com/stay/demo-a');
    expect(response.body).not.toContain('not-public@example.com');
    expect(response.body).not.toContain(document.id);
  });

  it('returns 404 HTML for an unknown publicId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/p/unknown-public-id',
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.body).toContain('This Pet ID is unavailable.');
    expect(response.body).not.toContain('Stay with Pico');
  });
});
