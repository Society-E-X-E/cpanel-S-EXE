import { createMockReq, createMockRes } from "../helpers";

const mockRun = jest.fn();
const mockAll = jest.fn();
const mockPrepare = jest.fn(() => ({ run: mockRun, all: mockAll }));

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

import handler from "../../pages/api/login";

describe("pages/api/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("returns 400 if username is missing", async () => {
      const req = createMockReq({ method: "POST", body: { password: "pass", timestamp: "t" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });

    it("returns 400 if password is missing", async () => {
      const req = createMockReq({ method: "POST", body: { username: "user", timestamp: "t" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });

    it("returns 400 if timestamp is missing", async () => {
      const req = createMockReq({ method: "POST", body: { username: "user", password: "pass" } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });

    it("inserts submission and returns 200 on valid data", async () => {
      const req = createMockReq({
        method: "POST",
        body: { username: "user1", password: "pass1", timestamp: "2024-01-01T00:00:00Z" },
      });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO submissions"));
      expect(mockRun).toHaveBeenCalledWith("user1", "pass1", "LOGIN", "ok", "2024-01-01T00:00:00Z", expect.any(String));
    });

    it("uses custom flow when provided", async () => {
      const req = createMockReq({
        method: "POST",
        body: { username: "user1", password: "pass1", flow: "REGISTER", timestamp: "t" },
      });
      const res = createMockRes();
      await handler(req, res);
      expect(mockRun).toHaveBeenCalledWith("user1", "pass1", "REGISTER", "ok", "t", expect.any(String));
    });
  });

  describe("GET", () => {
    it("returns submissions list", async () => {
      const rows = [{ id: 1, username: "u", flow: "LOGIN", status: "ok", timestamp: "t", server_timestamp: "st" }];
      mockAll.mockReturnValue(rows);
      const req = createMockReq({ method: "GET" });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(rows);
    });
  });

  describe("unsupported methods", () => {
    it("returns 405 for PUT", async () => {
      const req = createMockReq({ method: "PUT" });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });
  });
});
