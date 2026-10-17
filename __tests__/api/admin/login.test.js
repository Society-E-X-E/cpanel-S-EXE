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
    expect(res.headers["Set-Cookie"]).toContain("SameSite=Strict");
  });
});
