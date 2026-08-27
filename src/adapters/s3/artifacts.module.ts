import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { WALLET_ARTIFACT_STORE } from '../../ports/wallet-artifact-store.port';
import { S3WalletArtifactStore } from './s3-wallet-artifact-store';

function createS3Client(): S3Client {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  return new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'localstack',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'localstack',
    },
  });
}

@Module({
  providers: [
    {
      provide: WALLET_ARTIFACT_STORE,
      useFactory: () =>
        new S3WalletArtifactStore(
          createS3Client(),
          process.env.WALLET_ARTIFACTS_BUCKET ?? 'wallet-artifacts',
        ),
    },
  ],
  exports: [WALLET_ARTIFACT_STORE],
})
export class ArtifactsModule {}
