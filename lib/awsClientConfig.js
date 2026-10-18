import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

export function getAwsClientConfig(region = process.env.AWS_REGION) {
  if (!region) {
    throw new Error("AWS_REGION must be configured for AWS service access.");
  }
  const roleArn = process.env.AWS_ROLE_ARN;
  return {
    region,
    ...(roleArn ? { credentials: awsCredentialsProvider({ roleArn }) } : {}),
  };
}
