import { createMockReq, createMockRes } from "../../helpers";

jest.mock("../../../lib/session", () => ({
  getCurrentUser: jest.fn(),
  publicUser: jest.fn((user) => ({ id: user.id, username: user.username, role: user.role })),
  respondUnauthorized: jest.fn((res) => res.status(401).json({ status: "error" })),
}));

import handler from "../../../pages/api/admin/me";
import { getCurrentUser } from "../../../lib/session";

describe("current team session endpoint", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unsupported methods", () => {
    const res = createMockRes();
    handler(createMockReq({ method: "POST" }), res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 when no current account exists", () => {
    getCurrentUser.mockReturnValue(null);
    const res = createMockRes();
    handler(createMockReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it("returns the current database-backed account", () => {
    getCurrentUser.mockReturnValue({ id: 2, username: "member", role: "admin" });
    const res = createMockRes();
    handler(createMockReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({ id: 2, username: "member", role: "admin" });
  });
});
