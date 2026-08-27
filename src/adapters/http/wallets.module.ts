import { Module } from '@nestjs/common';
import { CreateWalletService, PUBLIC_BASE_URL } from '../../application/create-wallet.service';
import { WALLET_PROVIDER } from '../../ports/wallet-provider.port';
import { DocumentsModule } from '../dynamodb/documents.module';
import { StubWalletProvider } from '../providers/stub-wallet-provider';
import { TemplatesModule } from '../templates/templates.module';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [TemplatesModule, DocumentsModule],
  controllers: [WalletsController],
  providers: [
    CreateWalletService,
    {
      provide: WALLET_PROVIDER,
      useClass: StubWalletProvider,
    },
    {
      provide: PUBLIC_BASE_URL,
      useFactory: (): string =>
        (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(
          /\/$/,
          '',
        ),
    },
  ],
})
export class WalletsModule {}
