import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { WALLET_ARTIFACT_STORE } from '../../ports/wallet-artifact-store.port';
import { awsClientBase } from '../aws/aws-client-options';
import { S3WalletArtifactStore } from './s3-wallet-artifact-store';

function createS3Client(): S3Client {
  const base = awsClientBase();
  return new S3Client({
    ...base,
    ...(base.endpoint ? { forcePathStyle: true } : {}),
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
