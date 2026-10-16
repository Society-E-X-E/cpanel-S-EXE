import { createMockReq, createMockRes } from "../../helpers";

const mockGet = jest.fn();
const mockPrepare = jest.fn(() => ({ get: mockGet }));

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

jest.mock("../../../lib/auth", () => ({
  signToken: jest.fn(() => "mock-jwt-token"),
}));

jest.mock("bcryptjs", () => ({
  compareSync: jest.fn(),
}));

import handler from "../../../pages/api/admin/login";
import { compareSync } from "bcryptjs";

describe("team login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects requests without credentials", () => {
    const res = createMockRes();
    handler(createMockReq({ method: "POST", body: { username: "member" } }), res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid credentials", () => {
    mockGet.mockReturnValue(undefined);
    const res = createMockRes();
    handler(createMockReq({ method: "POST", body: { username: "member", password: "not-a-password" } }), res);
    expect(res.statusCode).toBe(401);
  });

  it("issues an HttpOnly, same-site cookie for a valid team account", () => {
    mockGet.mockReturnValue({ id: 7, username: "member", role: "moderator", password_hash: "hash" });
    compareSync.mockReturnValue(true);
    const res = createMockRes();
    handler(createMockReq({ method: "POST", body: { username: "member", password: "a-long-password" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Set-Cookie"]).toContain("HttpOnly");
    expect(res.headers["Set-Cookie"]).toContain("SameSite=Strict");
  });
});
