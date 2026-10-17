import { createMockReq, createMockRes } from "../../helpers";

const mockTransactions = new Map();
const mockHasLinkedAccount = { value: true };
const mockQuery = jest.fn(async (sql, args = []) => {
  if (sql.includes("SELECT * FROM oauth_login_transactions")) {
    const transaction = mockTransactions.get(args[0]);
    return { rows: transaction ? [transaction] : [] };
  }
  if (sql.includes("SELECT * FROM oauth_transactions")) return { rows: [] };
  if (sql.includes("FROM oauth_links AS link")) {
    return { rows: mockHasLinkedAccount.value ? [{ id: 17 }] : [] };
  }
  if (sql.includes("INSERT INTO oauth_login_transactions")) {
    mockTransactions.set(args[0], {
      state_hash: args[0],
      provider: args[1],
      code_verifier_encrypted: args[2],
      created_at: args[3],
    });
  } else if (sql.includes("DELETE FROM oauth_login_transactions WHERE provider")) {
    for (const [hash, transaction] of mockTransactions) {
      if (transaction.provider === args[0]) mockTransactions.delete(hash);
    }
  } else if (sql.includes("DELETE FROM oauth_login_transactions WHERE state_hash")) {
    mockTransactions.delete(args[0]);
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
    mockHasLinkedAccount.value = true;
    process.env.APP_BASE_URL = "https://dashboard.example";
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = "a-test-encryption-key-long-enough-to-be-valid";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
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
