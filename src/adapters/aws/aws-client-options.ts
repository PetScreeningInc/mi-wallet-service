export type AwsClientBaseOptions = {
  region: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

/**
 * Static keys when both env vars are set. Dummy LocalStack keys only when
 * `AWS_ENDPOINT_URL` is set. Otherwise omit credentials so the SDK default
 * chain (task/instance role) is used.
 */
export function awsClientBase(
  env: NodeJS.ProcessEnv = process.env,
): AwsClientBaseOptions {
  const endpoint = env.AWS_ENDPOINT_URL;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

  const credentials =
    accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : endpoint
        ? { accessKeyId: 'localstack', secretAccessKey: 'localstack' }
        : undefined;

  return {
    region: env.AWS_REGION ?? 'us-east-1',
    ...(endpoint ? { endpoint } : {}),
    ...(credentials ? { credentials } : {}),
  };
}
