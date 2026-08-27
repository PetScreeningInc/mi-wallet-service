import { Module } from '@nestjs/common';
import { GetApplePassService } from '../../application/get-apple-pass.service';
import {
  CreateWalletService,
  PUBLIC_BASE_URL,
  WALLET_PROVIDER_TIMEOUT_MS,
} from '../../application/create-wallet.service';
import { WALLET_PROVIDER } from '../../ports/wallet-provider.port';
import { DocumentsModule } from '../dynamodb/documents.module';
import { AppleWalletProvider } from '../providers/apple-wallet.provider';
import {
  APPLE_WALLET_CONFIG,
  appleWalletConfigFromEnv,
} from '../providers/apple-wallet.config';
import { DispatchWalletProvider } from '../providers/dispatch-wallet-provider';
import {
  GOOGLE_WALLET_CONFIG,
  googleWalletConfigFromEnv,
} from '../providers/google-wallet.config';
import { GoogleWalletProvider } from '../providers/google-wallet.provider';
import { ArtifactsModule } from '../s3/artifacts.module';
import { TemplatesModule } from '../templates/templates.module';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [TemplatesModule, DocumentsModule, ArtifactsModule],
  controllers: [WalletsController],
  providers: [
    CreateWalletService,
    GetApplePassService,
    GoogleWalletProvider,
    AppleWalletProvider,
    DispatchWalletProvider,
    {
      provide: WALLET_PROVIDER,
      useExisting: DispatchWalletProvider,
    },
    {
      provide: GOOGLE_WALLET_CONFIG,
      useFactory: googleWalletConfigFromEnv,
    },
    {
      provide: APPLE_WALLET_CONFIG,
      useFactory: appleWalletConfigFromEnv,
    },
    {
      provide: PUBLIC_BASE_URL,
      useFactory: (): string =>
        (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(
          /\/$/,
          '',
        ),
    },
    {
      provide: WALLET_PROVIDER_TIMEOUT_MS,
      useFactory: (): number => {
        const parsed = Number(process.env.WALLET_PROVIDER_TIMEOUT_MS ?? 8000);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 8000;
      },
    },
  ],
})
export class WalletsModule {}
