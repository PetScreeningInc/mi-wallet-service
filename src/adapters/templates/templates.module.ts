import { Module } from '@nestjs/common';
import { ValidateWalletDataService } from '../../application/validate-wallet-data.service';
import { TEMPLATE_REGISTRY } from '../../ports/template-registry.port';
import {
  defaultTemplatesDirectory,
  FileTemplateRegistry,
} from './file-template-registry';

@Module({
  providers: [
    {
      provide: TEMPLATE_REGISTRY,
      useFactory: () => FileTemplateRegistry.load(defaultTemplatesDirectory()),
    },
    ValidateWalletDataService,
  ],
  exports: [TEMPLATE_REGISTRY, ValidateWalletDataService],
})
export class TemplatesModule {}
