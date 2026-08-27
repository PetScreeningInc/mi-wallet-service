import { Body, Controller, HttpCode, HttpException, Post } from '@nestjs/common';
import { CreateWalletService } from '../../application/create-wallet.service';

@Controller('v1/wallets')
export class WalletsController {
  constructor(private readonly createWallet: CreateWalletService) {}

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
}
