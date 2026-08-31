import { Inject, Injectable } from '@nestjs/common';
import { pickPublicData } from '../domain/wallet-template';
import {
  TEMPLATE_REGISTRY,
  type TemplateRegistry,
} from '../ports/template-registry.port';
import {
  WALLET_DOCUMENT_REPOSITORY,
  type WalletDocumentRepository,
} from '../ports/wallet-document-repository.port';

export type GetPublicPageResult =
  | { ok: true; publicData: Record<string, unknown> }
  | { ok: false };

@Injectable()
export class GetPublicPageService {
  constructor(
    @Inject(WALLET_DOCUMENT_REPOSITORY)
    private readonly documents: WalletDocumentRepository,
    @Inject(TEMPLATE_REGISTRY) private readonly templates: TemplateRegistry,
  ) {}

  async execute(publicId: string): Promise<GetPublicPageResult> {
    if (publicId.trim() === '') {
      return { ok: false };
    }

    const document = await this.documents.findByPublicId(publicId);
    if (!document) {
      return { ok: false };
    }

    const template = this.templates.resolve(
      document.templateKey,
      document.templateVersion,
    );
    if (!template) {
      return { ok: false };
    }

    return {
      ok: true,
      publicData: pickPublicData(document.data, template.fields),
    };
  }
}
