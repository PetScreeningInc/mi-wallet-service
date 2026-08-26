import { Module } from '@nestjs/common';
import { HealthModule } from './adapters/http/health.module';
import { TemplatesModule } from './adapters/templates/templates.module';

@Module({
  imports: [HealthModule, TemplatesModule],
})
export class AppModule {}
