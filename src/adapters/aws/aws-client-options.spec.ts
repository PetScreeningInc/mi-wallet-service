import { awsClientBase } from './aws-client-options';

describe('awsClientBase', () => {
  it('uses static keys when both access key env vars are set', () => {
    expect(
      awsClientBase({
        AWS_REGION: 'us-west-2',
        AWS_ACCESS_KEY_ID: 'localstack',
        AWS_SECRET_ACCESS_KEY: 'localstack',
        AWS_ENDPOINT_URL: 'http://127.0.0.1:4566',
      }),
    ).toEqual({
      region: 'us-west-2',
      endpoint: 'http://127.0.0.1:4566',
      credentials: {
        accessKeyId: 'localstack',
        secretAccessKey: 'localstack',
      },
    });
  });

  it('uses dummy LocalStack keys when only AWS_ENDPOINT_URL is set', () => {
    expect(
      awsClientBase({
        AWS_ENDPOINT_URL: 'http://127.0.0.1:4566',
      }),
    ).toEqual({
      region: 'us-east-1',
      endpoint: 'http://127.0.0.1:4566',
      credentials: {
        accessKeyId: 'localstack',
        secretAccessKey: 'localstack',
      },
    });
  });

  it('omits credentials so the default chain is used when there is no endpoint or keys', () => {
    expect(awsClientBase({ AWS_REGION: 'us-east-1' })).toEqual({
      region: 'us-east-1',
    });
  });
});
