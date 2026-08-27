import { Module } from '@nestjs/common';
import { DocumentsModule } from './adapters/dynamodb/documents.module';
import { HealthModule } from './adapters/http/health.module';
import { TemplatesModule } from './adapters/templates/templates.module';

@Module({
  imports: [HealthModule, TemplatesModule, DocumentsModule],
})
export class AppModule {}
