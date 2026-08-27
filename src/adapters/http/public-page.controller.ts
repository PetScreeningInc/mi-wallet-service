import { Controller, Get, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { GetPublicPageService } from '../../application/get-public-page.service';
import {
  renderPublicPageHtml,
  renderPublicPageNotFoundHtml,
} from '../html/public-page-html';

@Controller('p')
export class PublicPageController {
  constructor(private readonly getPublicPage: GetPublicPageService) {}

  @Get(':publicId')
  async show(
    @Param('publicId') publicId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.getPublicPage.execute(publicId);
    if (!result.ok) {
      reply
        .status(404)
        .header('Cache-Control', 'no-store')
        .type('text/html; charset=utf-8')
        .send(renderPublicPageNotFoundHtml());
      return;
    }
    reply
      .status(200)
      .header('Cache-Control', 'no-store')
      .type('text/html; charset=utf-8')
      .send(renderPublicPageHtml(result.publicData));
  }
}
