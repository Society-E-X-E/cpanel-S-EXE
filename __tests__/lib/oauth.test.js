import {
  createPkcePair,
  decryptOAuthSecret,
  encryptOAuthSecret,
  getProviderStatus,
  getRedirectUri,
  exchangeOAuthCode,
} from "../../lib/oauth";

describe("OAuth helpers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = "test-encryption-key-with-at-least-32-characters";
    process.env.APP_BASE_URL = "https://dashboard.example";
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it("creates a PKCE challenge from a high-entropy verifier", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).not.toBe(verifier);
  });

  it("encrypts OAuth secrets and rejects a modified ciphertext", () => {
    const encrypted = encryptOAuthSecret("private-access-token");
    expect(encrypted).not.toContain("private-access-token");
    expect(decryptOAuthSecret(encrypted)).toBe("private-access-token");
    const [iv, tag, ciphertext] = encrypted.split(".");
    const changedIv = `${iv[0] === "A" ? "B" : "A"}${iv.slice(1)}`;
    expect(() => decryptOAuthSecret(`${changedIv}.${tag}.${ciphertext}`)).toThrow();
  });

  it("builds provider callback URLs from the configured application origin", () => {
    expect(getRedirectUri("github")).toBe("https://dashboard.example/api/admin/oauth/github");
  });

  it("exchanges a code and retrieves only the provider identity", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "provider-token", token_type: "bearer", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, login: "member", name: "Team Member", html_url: "https://github.com/member" }),
      });

    const result = await exchangeOAuthCode("github", "authorization-code", "pkce-verifier", "https://dashboard.example/callback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer provider-token");
    expect(result.profile).toEqual({
      subject: "42",
      displayName: "Team Member",
      username: "member",
      profileUrl: "https://github.com/member",
      avatarUrl: "",
    });
    expect(result.accessToken).toBe("provider-token");
    expect(result.scopes).toBe("read:user");
  });

  it("returns Google's HTTPS profile photo for the team avatar", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "google-token", token_type: "bearer" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: "google-subject",
          name: "Team Member",
          picture: "https://lh3.googleusercontent.com/profile-photo",
        }),
      });

    const result = await exchangeOAuthCode("google", "authorization-code", "pkce-verifier", "https://dashboard.example/callback");
    expect(result.profile.avatarUrl).toBe("https://lh3.googleusercontent.com/profile-photo");
    expect(result.scopes).toBe("openid profile");
  });

  it("reports which provider apps are configured", () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    expect(getProviderStatus().find((provider) => provider.id === "github").configured).toBe(true);
    expect(getProviderStatus().find((provider) => provider.id === "google").configured).toBe(false);
  });
});
