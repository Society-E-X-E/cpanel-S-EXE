import { createMockReq, createMockRes } from "../../helpers";

const mockQuery = jest.fn();

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { migrate: jest.fn(), query: (...args) => mockQuery(...args) },
}));

jest.mock("../../../lib/auth", () => ({
  signToken: jest.fn(() => "mock-jwt-token"),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

import handler from "../../../pages/api/admin/login";
import { compare } from "bcryptjs";

describe("team login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
    process.env.JWT_SECRET = "test-secret-with-at-least-thirty-two-bytes";
  });

  it("rejects requests without credentials", async () => {
    const res = createMockRes();
    await handler(createMockReq({ method: "POST", body: { username: "member" } }), res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid credentials", async () => {
    const res = createMockRes();
    await handler(createMockReq({ method: "POST", body: { username: "member", password: "not-a-password" } }), res);
    expect(res.statusCode).toBe(401);
  });

  it("issues an HttpOnly, same-site cookie for a valid team account", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 7, username: "member", role: "moderator", password_hash: "hash" }] });
    compare.mockResolvedValue(true);
    const res = createMockRes();
    await handler(createMockReq({ method: "POST", body: { username: "member", password: "a-long-password" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Set-Cookie"]).toContain("HttpOnly");
    expect(res.headers["Set-Cookie"]).toContain("Max-Age=5400");
    expect(res.headers["Set-Cookie"]).toContain("SameSite=Strict");
  });

  it("marks a newly-created member login as requiring a password change", async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        id: 7,
        username: "member",
        role: "moderator",
        password_hash: "hash",
        must_change_password: true,
        token_version: 0,
      }],
    });
    compare.mockResolvedValue(true);
    const res = createMockRes();
    await handler(createMockReq({ method: "POST", body: { username: "member", password: "initial-password" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
  });
});
