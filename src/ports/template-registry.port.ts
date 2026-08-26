import type {
  TemplateDataValidation,
  WalletTemplate,
} from '../domain/wallet-template';

export const TEMPLATE_REGISTRY = Symbol('TemplateRegistry');

export interface TemplateRegistry {
  resolve(key: string, version?: number): WalletTemplate | undefined;
  validate(template: WalletTemplate, data: unknown): TemplateDataValidation;
}
