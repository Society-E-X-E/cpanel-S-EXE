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

describe("pages/api/admin/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-POST methods", () => {
    const req = createMockReq({ method: "GET" });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(["POST"]);
  });

  it("returns 400 if username is missing", () => {
    const req = createMockReq({ method: "POST", body: { password: "pass" } });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 if password is missing", () => {
    const req = createMockReq({ method: "POST", body: { username: "admin" } });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 401 if user not found", () => {
    mockGet.mockReturnValue(undefined);
    const req = createMockReq({ method: "POST", body: { username: "noone", password: "pass" } });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Acceso denegado");
  });

  it("returns 401 if password does not match", () => {
    mockGet.mockReturnValue({ id: 1, username: "admin", password_hash: "hashed", role: "admin" });
    compareSync.mockReturnValue(false);
    const req = createMockReq({ method: "POST", body: { username: "admin", password: "wrong" } });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 200 and sets cookie on valid login", () => {
    mockGet.mockReturnValue({ id: 1, username: "admin", password_hash: "hashed", role: "admin" });
    compareSync.mockReturnValue(true);
    const req = createMockReq({ method: "POST", body: { username: "admin", password: "correct" } });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.headers["Set-Cookie"]).toContain("authToken=mock-jwt-token");
  });
});
