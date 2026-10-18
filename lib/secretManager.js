import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { getAwsClientConfig } from "./awsClientConfig";

const CACHE_TTL_MS = 5 * 60 * 1000;

let client;
let cachedSecret;
let cachedSecretExpiresAt = 0;
let pendingSecret;

function getClient() {
  if (!client) client = new SecretsManagerClient(getAwsClientConfig());
  return client;
}

function extractSecretValue(secretString) {
  if (typeof secretString !== "string") {
    throw new Error("The configured OTP secret does not contain a SecretString.");
  }

  let parsed;
  try {
    parsed = JSON.parse(secretString);
  } catch {
    return secretString;
  }

  if (typeof parsed === "string") return parsed;
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    typeof parsed.OTP_HASH_SECRET === "string"
  ) {
    return parsed.OTP_HASH_SECRET;
  }
  throw new Error("The configured JSON secret must contain a string OTP_HASH_SECRET property.");
}

export async function getOtpSecretValue() {
  const secretId = process.env.OTP_HASH_SECRET_ID;
  if (!secretId) {
    throw new Error("OTP_HASH_SECRET_ID must identify the secret in AWS Secrets Manager.");
  }
  if (cachedSecret && Date.now() < cachedSecretExpiresAt) return cachedSecret;
  if (pendingSecret) return pendingSecret;

  pendingSecret = getClient()
    .send(new GetSecretValueCommand({ SecretId: secretId }))
    .then((result) => {
      const secret = extractSecretValue(result.SecretString);
      if (secret.length < 32) {
        throw new Error("The OTP_HASH_SECRET value must contain at least 32 characters.");
      }
      cachedSecret = secret;
      cachedSecretExpiresAt = Date.now() + CACHE_TTL_MS;
      return secret;
    })
    .catch((error) => {
      cachedSecret = undefined;
      cachedSecretExpiresAt = 0;
      throw error;
    })
    .finally(() => {
      pendingSecret = undefined;
    });

  return pendingSecret;
}
