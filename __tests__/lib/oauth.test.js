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

  it("retrieves and returns LinkedIn identity, email, and profile photo", async () => {
    process.env.LINKEDIN_CLIENT_ID = "linkedin-client-id";
    process.env.LINKEDIN_CLIENT_SECRET = "linkedin-client-secret";
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "linkedin-token", token_type: "Bearer" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: "linkedin-subject",
          name: "Team Member",
          email: "member@example.com",
          picture: "https://media.licdn.example/member.jpg",
        }),
      });

    const result = await exchangeOAuthCode("linkedin", "authorization-code", "pkce-verifier", "https://dashboard.example/callback");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toMatch(/^Bearer /);
    expect(result.profile).toEqual({
      subject: "linkedin-subject",
      displayName: "Team Member",
      username: "member@example.com",
      profileUrl: "",
      avatarUrl: "https://media.licdn.example/member.jpg",
    });
    expect(result.scopes).toBe("openid profile email");
  });

  it("retrieves a GitLab account using the read_user scope", async () => {
    process.env.GITLAB_CLIENT_ID = "gitlab-client-id";
    process.env.GITLAB_CLIENT_SECRET = "gitlab-client-secret";
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "gitlab-token", token_type: "Bearer" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 42,
          username: "member",
          name: "Team Member",
          web_url: "https://gitlab.com/member",
        }),
      });

    const result = await exchangeOAuthCode("gitlab", "authorization-code", "pkce-verifier", "https://dashboard.example/callback");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toMatch(/^Bearer /);
    expect(result.profile).toEqual({
      subject: "42",
      displayName: "Team Member",
      username: "member",
      profileUrl: "https://gitlab.com/member",
      avatarUrl: "",
    });
    expect(result.scopes).toBe("read_user");
  });

  it("authenticates X confidential clients with HTTP Basic during token exchange", async () => {
    process.env.X_CLIENT_ID = "x-client-id";
    process.env.X_CLIENT_SECRET = "x-client-secret";
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "x-access-token", token_type: "bearer" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: "x-user-id", name: "Team Member", username: "member" } }),
      });

    const result = await exchangeOAuthCode("x", "authorization-code", "pkce-verifier", "https://dashboard.example/api/admin/oauth/x");
    const tokenRequest = fetchMock.mock.calls[0][1];
    expect(tokenRequest.headers.Authorization).toBe(
      `Basic ${Buffer.from("x-client-id:x-client-secret").toString("base64")}`,
    );
    expect(tokenRequest.body.get("client_id")).toBeNull();
    expect(tokenRequest.body.get("client_secret")).toBeNull();
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.x.com/2/users/me?user.fields=name,username");
    expect(result.profile).toEqual({
      subject: "x-user-id",
      displayName: "Team Member",
      username: "member",
      profileUrl: "https://x.com/member",
      avatarUrl: "",
    });
  });

  it("reports which provider apps are configured", () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    expect(getProviderStatus().find((provider) => provider.id === "github").configured).toBe(true);
    expect(getProviderStatus().find((provider) => provider.id === "google").configured).toBe(false);
  });
});
