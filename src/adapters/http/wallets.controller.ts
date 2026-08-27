import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CreateWalletService } from '../../application/create-wallet.service';
import { GetApplePassService } from '../../application/get-apple-pass.service';

@Controller('v1/wallets')
export class WalletsController {
  constructor(
    private readonly createWallet: CreateWalletService,
    private readonly getApplePass: GetApplePassService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown): Promise<{
    id: string;
    publicUrl: string;
    provider: {
      type: string;
      status: string;
      url?: string;
      error?: string;
    };
  }> {
    const result = await this.createWallet.execute(body);
    if (!result.ok) {
      const errorBody: {
        code: string;
        message: string;
        issues?: typeof result.issues;
      } = {
        code: result.code,
        message: result.message,
      };
      if (result.issues !== undefined) {
        errorBody.issues = result.issues;
      }
      throw new HttpException(errorBody, 400);
    }
    return {
      id: result.id,
      publicUrl: result.publicUrl,
      provider: result.provider,
    };
  }

  @Get(':id/apple')
  async downloadApple(
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.getApplePass.execute(id);
    if (!result.ok) {
      reply.status(404).send({
        code: 'NOT_FOUND',
        message: 'Unknown wallet',
      });
      return;
    }
    reply
      .status(200)
      .header('Content-Type', 'application/vnd.apple.pkpass')
      .header('Content-Disposition', 'attachment; filename="wallet.pkpass"')
      .send(result.bytes);
  }
}
