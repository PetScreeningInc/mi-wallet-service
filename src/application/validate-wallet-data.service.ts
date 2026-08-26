import { Inject, Injectable } from '@nestjs/common';
import type { SchemaIssue, WalletTemplate } from '../domain/wallet-template';
import {
  TEMPLATE_REGISTRY,
  type TemplateRegistry,
} from '../ports/template-registry.port';

export type ValidateWalletDataInput = {
  template: string;
  templateVersion?: number;
  data: unknown;
};

export type ValidateWalletDataResult =
  | { ok: true; template: WalletTemplate }
  | { ok: false; code: 'UNKNOWN_TEMPLATE' }
  | { ok: false; code: 'SCHEMA_INVALID'; issues: SchemaIssue[] };

@Injectable()
export class ValidateWalletDataService {
  constructor(
    @Inject(TEMPLATE_REGISTRY) private readonly templates: TemplateRegistry,
  ) {}

  execute(input: ValidateWalletDataInput): ValidateWalletDataResult {
    const template = this.templates.resolve(
      input.template,
      input.templateVersion,
    );
    if (!template) {
      return { ok: false, code: 'UNKNOWN_TEMPLATE' };
    }
    const validation = this.templates.validate(template, input.data);
    if (!validation.ok) {
      return { ok: false, code: 'SCHEMA_INVALID', issues: validation.issues };
    }
    return { ok: true, template };
  }
}
