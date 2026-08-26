import { Module } from '@nestjs/common';
import { HealthModule } from './adapters/http/health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
