import { createMockReq, createMockRes } from "../../helpers";

jest.mock("../../../lib/auth", () => ({
  verifyToken: jest.fn(),
}));

import handler from "../../../pages/api/admin/me";
import { verifyToken } from "../../../lib/auth";

describe("pages/api/admin/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-GET methods", () => {
    const req = createMockReq({ method: "POST" });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 if no authToken cookie", () => {
    const req = createMockReq({ method: "GET", cookies: {} });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 if token is invalid", () => {
    verifyToken.mockReturnValue(null);
    const req = createMockReq({ method: "GET", cookies: { authToken: "bad" } });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Token inválido");
  });

  it("returns user data on valid token", () => {
    verifyToken.mockReturnValue({ userId: 1, username: "admin", role: "admin" });
    const req = createMockReq({ method: "GET", cookies: { authToken: "valid" } });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({ id: 1, username: "admin", role: "admin" });
  });
});
