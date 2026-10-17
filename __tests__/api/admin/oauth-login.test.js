import { createMockReq, createMockRes } from "../../helpers";

const mockTransactions = new Map();
const mockLinkTransactions = new Map();
const mockLinkedConnections = [];
const mockHasLinkedAccount = { value: true };
const mockQuery = jest.fn(async (sql, args = []) => {
  if (sql.includes("SELECT * FROM oauth_login_transactions")) {
    const transaction = mockTransactions.get(args[0]);
    return { rows: transaction ? [transaction] : [] };
  }
  if (sql.includes("SELECT * FROM oauth_transactions")) {
    const transaction = mockLinkTransactions.get(args[0]);
    return { rows: transaction ? [transaction] : [] };
  }
  if (sql.includes("FROM oauth_links AS link")) {
    return { rows: mockHasLinkedAccount.value ? [{ id: 17 }] : [] };
  }
  if (sql.includes("SELECT id FROM staff_users WHERE id")) return { rows: [{ id: args[0] }] };
  if (sql.includes("SELECT user_id FROM oauth_links")) return { rows: [] };
  if (sql.includes("INSERT INTO oauth_login_transactions")) {
    mockTransactions.set(args[0], {
      state_hash: args[0],
      provider: args[1],
      code_verifier_encrypted: args[2],
      created_at: args[3],
    });
  } else if (sql.includes("INSERT INTO oauth_transactions")) {
    mockLinkTransactions.set(args[0], {
      state_hash: args[0],
      user_id: args[1],
      provider: args[2],
      code_verifier_encrypted: args[3],
      created_at: args[4],
    });
  } else if (sql.includes("INSERT INTO oauth_links")) {
    mockLinkedConnections.push(args);
  } else if (sql.includes("DELETE FROM oauth_login_transactions WHERE provider")) {
    for (const [hash, transaction] of mockTransactions) {
      if (transaction.provider === args[0]) mockTransactions.delete(hash);
    }
  } else if (sql.includes("DELETE FROM oauth_login_transactions WHERE state_hash")) {
    mockTransactions.delete(args[0]);
  } else if (sql.includes("DELETE FROM oauth_transactions WHERE state_hash")) {
    mockLinkTransactions.delete(args[0]);
  }
  return { rows: [] };
});
const mockSignToken = jest.fn(() => "session-jwt");
const mockExchangeOAuthCode = jest.fn(async () => ({
  profile: {
    subject: "google-subject",
    displayName: "Member",
    username: "",
    profileUrl: "",
    avatarUrl: "https://lh3.googleusercontent.com/profile-photo",
  },
  accessToken: "provider-access-token",
  expiresAt: "",
  scopes: "openid profile",
}));

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { migrate: jest.fn(), query: (...args) => mockQuery(...args) },
}));

jest.mock("../../../lib/auth", () => ({
  signToken: (...args) => mockSignToken(...args),
}));

jest.mock("../../../lib/session", () => ({
  getCurrentUser: jest.fn(),
  respondUnauthorized: jest.fn((res) => res.status(401).json({ status: "error" })),
}));

jest.mock("../../../lib/oauth", () => {
  const actual = jest.requireActual("../../../lib/oauth");
  return {
    ...actual,
    exchangeOAuthCode: (...args) => mockExchangeOAuthCode(...args),
  };
});

import handler from "../../../pages/api/admin/oauth/[provider]";
import { getCurrentUser } from "../../../lib/session";

describe("OAuth team login", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactions.clear();
    mockLinkTransactions.clear();
    mockLinkedConnections.length = 0;
    mockHasLinkedAccount.value = true;
    process.env.APP_BASE_URL = "https://dashboard.example";
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = "a-test-encryption-key-long-enough-to-be-valid";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.GITLAB_CLIENT_ID = "gitlab-client-id";
    process.env.GITLAB_CLIENT_SECRET = "gitlab-client-secret";
    process.env.LINKEDIN_CLIENT_ID = "linkedin-client-id";
    process.env.LINKEDIN_CLIENT_SECRET = "linkedin-client-secret";
    process.env.NODE_ENV = "production";
    getCurrentUser.mockReturnValue(null);
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  async function beginLogin() {
    const res = createMockRes();
    await handler(createMockReq({
      method: "GET",
      query: { provider: "google", action: "login" },
    }), res);
    const cookie = res.headers["Set-Cookie"];
    const state = cookie.match(/society_oauth_login_google=([^;]+)/)[1];
    return { res, state, cookie };
  }

  async function finishLogin(state, cookieState = state) {
    const res = createMockRes();
    await handler(createMockReq({
      method: "GET",
      query: { provider: "google", state, code: "authorization-code" },
      cookies: { society_oauth_login_google: cookieState },
    }), res);
    return res;
  }

  it("starts GitLab authorization with its configured scope and PKCE", async () => {
    getCurrentUser.mockResolvedValue({ id: 23, role: "admin" });
    const res = createMockRes();
    await handler(createMockReq({
      method: "GET",
      query: { provider: "gitlab" },
    }), res);

    const authorizationUrl = new URL(res.headers.Location);
    expect(res.statusCode).toBe(302);
    expect(authorizationUrl.origin).toBe("https://gitlab.com");
    expect(authorizationUrl.searchParams.get("scope")).toBe("read_user");
    expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe("https://dashboard.example/api/admin/oauth/gitlab");
  });

  it("persists LinkedIn profile data and encrypted token when linking an account", async () => {
    getCurrentUser.mockResolvedValue({ id: 23, role: "admin" });
    mockExchangeOAuthCode.mockResolvedValue({
      profile: {
        subject: "linkedin-subject",
        displayName: "Team Member",
        username: "member@example.com",
        profileUrl: "",
        avatarUrl: "https://media.licdn.example/member.jpg",
      },
      accessToken: "linkedin-access-token",
      expiresAt: "",
      scopes: "openid profile email",
    });

    const beginRes = createMockRes();
    await handler(createMockReq({
      method: "GET",
      query: { provider: "linkedin" },
    }), beginRes);
    const linkCookie = beginRes.headers["Set-Cookie"];
    const state = linkCookie.match(/society_oauth_linkedin=([^;]+)/)[1];

    const callbackRes = createMockRes();
    await handler(createMockReq({
      method: "GET",
      query: { provider: "linkedin", state, code: "authorization-code" },
      cookies: { society_oauth_linkedin: state },
    }), callbackRes);

    expect(callbackRes.headers.Location).toBe("/profile?oauth=connected&provider=linkedin");
    expect(mockLinkedConnections).toHaveLength(1);
    expect(mockLinkedConnections[0]).toEqual(expect.arrayContaining([
      23,
      "linkedin",
      "linkedin-subject",
      "Team Member",
      "member@example.com",
      "https://media.licdn.example/member.jpg",
    ]));
    expect(mockLinkedConnections[0]).not.toContain("linkedin-access-token");
  });

  it("returns a safe Google organization restriction reason to the login page", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { state } = await beginLogin();
    const res = createMockRes();
    await handler(createMockReq({
      method: "GET",
      query: { provider: "google", state, error: "org_internal" },
      cookies: { society_oauth_login_google: state },
    }), res);

    expect(res.headers.Location).toBe("/?oauth=provider-error&provider=google&reason=org_internal");
  });

  it("starts OAuth login without an existing panel session", async () => {
    const { res } = await beginLogin();
    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toContain("accounts.google.com");
    expect(res.headers["Set-Cookie"]).toContain("HttpOnly");
  });

  it("logs in only when the provider identity is already linked to a team member", async () => {
    const { state } = await beginLogin();
    const res = await finishLogin(state);

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe("/dashboard");
    expect(mockSignToken).toHaveBeenCalledWith({ userId: 17 });
    expect(res.headers["Set-Cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("authToken=session-jwt"),
      expect.stringContaining("society_oauth_login_google=;"),
    ]));
  });

  it("rejects an unlinked social identity without creating an account or session", async () => {
    mockHasLinkedAccount.value = false;
    const { state } = await beginLogin();
    const res = await finishLogin(state);

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toContain("/?oauth=unlinked&provider=google");
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it("rejects callback state not bound to the login cookie", async () => {
    const { state } = await beginLogin();
    const res = await finishLogin(state, "attacker-controlled-state");

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toContain("/?oauth=error&provider=google");
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it("reports configured providers for the login form without authenticating", async () => {
    const res = createMockRes();
    await handler(createMockReq({
      method: "GET",
      query: { provider: "google", action: "login-status" },
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.providers.find((provider) => provider.id === "google").configured).toBe(true);
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});
