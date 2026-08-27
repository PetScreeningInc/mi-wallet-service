import { Module } from '@nestjs/common';
import { DocumentsModule } from './adapters/dynamodb/documents.module';
import { HealthModule } from './adapters/http/health.module';
import { PublicPageModule } from './adapters/http/public-page.module';
import { WalletsModule } from './adapters/http/wallets.module';
import { TemplatesModule } from './adapters/templates/templates.module';

@Module({
  imports: [
    HealthModule,
    TemplatesModule,
    DocumentsModule,
    WalletsModule,
    PublicPageModule,
  ],
})
export class AppModule {}
