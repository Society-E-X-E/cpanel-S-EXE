import { createMockReq, createMockRes } from "../../helpers";

const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();
const mockPrepare = jest.fn((sql) => {
  if (sql.includes("SELECT id FROM users")) return { get: mockGet };
  if (sql.includes("SELECT id, username")) return { all: mockAll };
  return { run: mockRun, get: mockGet };
});

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

jest.mock("../../../lib/auth", () => ({
  verifyToken: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  compareSync: jest.fn(),
  hashSync: jest.fn(() => "hashed_password"),
}));

import handler from "../../../pages/api/admin/users";
import { verifyToken } from "../../../lib/auth";

describe("pages/api/admin/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if no authToken", async () => {
    const req = createMockReq({ method: "GET", cookies: {} });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 if token invalid", async () => {
    verifyToken.mockReturnValue(null);
    const req = createMockReq({ method: "GET", cookies: { authToken: "bad" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 if not admin role", async () => {
    verifyToken.mockReturnValue({ role: "user" });
    const req = createMockReq({ method: "GET", cookies: { authToken: "tok" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  describe("authenticated as admin", () => {
    beforeEach(() => {
      verifyToken.mockReturnValue({ userId: 1, username: "admin", role: "admin" });
    });

    it("GET returns list of users", async () => {
      const users = [{ id: 1, username: "admin", role: "admin" }];
      mockAll.mockReturnValue(users);
      const req = createMockReq({ method: "GET", cookies: { authToken: "tok" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.users).toEqual(users);
    });

    it("POST returns 400 if username missing", async () => {
      const req = createMockReq({ method: "POST", cookies: { authToken: "tok" }, body: { password: "pass" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });

    it("POST returns 409 if user already exists", async () => {
      mockGet.mockReturnValue({ id: 2 });
      const req = createMockReq({ method: "POST", cookies: { authToken: "tok" }, body: { username: "existing", password: "pass" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(409);
    });

    it("POST creates user and returns 201", async () => {
      mockGet.mockReturnValue(undefined);
      mockRun.mockReturnValue({ lastInsertRowid: 5 });
      const req = createMockReq({ method: "POST", cookies: { authToken: "tok" }, body: { username: "newuser", password: "pass123" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.body.user.id).toBe(5);
      expect(res.body.user.username).toBe("newuser");
    });

    it("DELETE returns 400 if id missing", async () => {
      const req = createMockReq({ method: "DELETE", cookies: { authToken: "tok" }, query: {} });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });

    it("DELETE removes user and returns 200", async () => {
      const req = createMockReq({ method: "DELETE", cookies: { authToken: "tok" }, query: { id: "3" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    it("returns 405 for unsupported methods", async () => {
      const req = createMockReq({ method: "PATCH", cookies: { authToken: "tok" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });
  });
});
