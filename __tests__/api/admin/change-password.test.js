import { createMockReq, createMockRes } from "../../helpers";

const mockQuery = jest.fn();

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { query: (...args) => mockQuery(...args) },
}));

jest.mock("../../../lib/session", () => ({
  getCurrentUser: jest.fn(),
  respondUnauthorized: jest.fn((res) => res.status(401).json({ status: "error" })),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(async () => "new-hash"),
}));

import handler from "../../../pages/api/admin/change-password";
import { compare } from "bcryptjs";
import { getCurrentUser } from "../../../lib/session";

describe("authenticated password changes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: 7, must_change_password: true });
    mockQuery.mockResolvedValue({ rows: [{ password_hash: "old-hash" }] });
    compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  });

  it("permits only a verified current password and then invalidates the session", async () => {
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { currentPassword: "initial-password", newPassword: "new-private-password" },
    }), res);

    expect(getCurrentUser).toHaveBeenCalledWith(expect.any(Object), { allowPasswordChange: true });
    expect(res.statusCode).toBe(200);
    expect(res.headers["Set-Cookie"]).toContain("Max-Age=0");
    expect(mockQuery.mock.calls[1][0]).toContain("token_version = token_version + 1");
  });

  it("rejects a password shorter than the minimum", async () => {
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { currentPassword: "initial-password", newPassword: "short" },
    }), res);

    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
