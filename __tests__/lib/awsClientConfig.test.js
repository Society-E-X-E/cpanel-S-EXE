const mockAwsCredentialsProvider = jest.fn(() => "vercel-oidc-credentials");

jest.mock("@vercel/oidc-aws-credentials-provider", () => ({
  awsCredentialsProvider: (...args) => mockAwsCredentialsProvider(...args),
}));

import { getAwsClientConfig } from "../../lib/awsClientConfig";

describe("AWS client configuration", () => {
  const originalRegion = process.env.AWS_REGION;
  const originalRoleArn = process.env.AWS_ROLE_ARN;

  afterEach(() => {
    if (originalRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = originalRegion;
    if (originalRoleArn === undefined) delete process.env.AWS_ROLE_ARN;
    else process.env.AWS_ROLE_ARN = originalRoleArn;
    jest.clearAllMocks();
  });

  it("uses Vercel OIDC credentials when a role ARN is configured", () => {
    process.env.AWS_REGION = "us-east-2";
    process.env.AWS_ROLE_ARN = "arn:aws:iam::123456789012:role/dashboard";

    expect(getAwsClientConfig()).toEqual({
      region: "us-east-2",
      credentials: "vercel-oidc-credentials",
    });
    expect(mockAwsCredentialsProvider).toHaveBeenCalledWith({
      roleArn: "arn:aws:iam::123456789012:role/dashboard",
    });
  });

  it("leaves local AWS CLI credential resolution to the AWS SDK", () => {
    process.env.AWS_REGION = "us-east-2";
    delete process.env.AWS_ROLE_ARN;

    expect(getAwsClientConfig()).toEqual({ region: "us-east-2" });
    expect(mockAwsCredentialsProvider).not.toHaveBeenCalled();
  });

  it("requires a region", () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ROLE_ARN;

    expect(() => getAwsClientConfig()).toThrow(
      "AWS_REGION must be configured for AWS service access.",
    );
  });
});
