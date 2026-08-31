import { Module } from '@nestjs/common';
import { GetPublicPageService } from '../../application/get-public-page.service';
import { DocumentsModule } from '../dynamodb/documents.module';
import { TemplatesModule } from '../templates/templates.module';
import { PublicPageController } from './public-page.controller';

@Module({
  imports: [TemplatesModule, DocumentsModule],
  controllers: [PublicPageController],
  providers: [GetPublicPageService],
})
export class PublicPageModule {}
