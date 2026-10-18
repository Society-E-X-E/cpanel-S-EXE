const mockSend = jest.fn();
const mockGetSecretValueCommand = jest.fn((input) => ({ input }));
const mockSecretsManagerClient = jest.fn(() => ({ send: (...args) => mockSend(...args) }));
const mockGetAwsClientConfig = jest.fn(() => ({ region: "us-east-2" }));

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  GetSecretValueCommand: mockGetSecretValueCommand,
  SecretsManagerClient: mockSecretsManagerClient,
}));

jest.mock("../../lib/awsClientConfig", () => ({
  getAwsClientConfig: (...args) => mockGetAwsClientConfig(...args),
}));

describe("AWS Secrets Manager OTP secret", () => {
  const originalRegion = process.env.AWS_REGION;
  const originalSecretId = process.env.OTP_HASH_SECRET_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = "us-east-2";
    process.env.OTP_HASH_SECRET_ID = "OTP_HASH_SECRET";
  });

  afterAll(() => {
    if (originalRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = originalRegion;
    if (originalSecretId === undefined) delete process.env.OTP_HASH_SECRET_ID;
    else process.env.OTP_HASH_SECRET_ID = originalSecretId;
  });

  it("loads the JSON OTP_HASH_SECRET property and caches it in memory", async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({ OTP_HASH_SECRET: "a".repeat(64) }),
    });
    const { getOtpSecretValue } = await import("../../lib/secretManager");

    await expect(getOtpSecretValue()).resolves.toBe("a".repeat(64));
    await expect(getOtpSecretValue()).resolves.toBe("a".repeat(64));
    expect(mockGetAwsClientConfig).toHaveBeenCalledWith();
    expect(mockGetSecretValueCommand).toHaveBeenCalledWith({ SecretId: "OTP_HASH_SECRET" });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("rejects JSON secrets that do not contain the OTP_HASH_SECRET property", async () => {
    mockSend.mockResolvedValue({ SecretString: JSON.stringify({ OTHER_SECRET: "b".repeat(64) }) });
    jest.resetModules();
    const { getOtpSecretValue } = await import("../../lib/secretManager");

    await expect(getOtpSecretValue()).rejects.toThrow(
      "The configured JSON secret must contain a string OTP_HASH_SECRET property.",
    );
  });

  it("rejects secret values shorter than 32 characters", async () => {
    mockSend.mockResolvedValue({ SecretString: JSON.stringify({ OTP_HASH_SECRET: "short" }) });
    jest.resetModules();
    const { getOtpSecretValue } = await import("../../lib/secretManager");

    await expect(getOtpSecretValue()).rejects.toThrow(
      "The OTP_HASH_SECRET value must contain at least 32 characters.",
    );
  });
});
