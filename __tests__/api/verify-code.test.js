import { createMockReq, createMockRes } from "../helpers";

const mockGet = jest.fn();
const mockPrepare = jest.fn(() => ({ get: mockGet }));

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

import handler from "../../pages/api/verify-code";

describe("pages/api/verify-code", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-POST methods", async () => {
    const req = createMockReq({ method: "GET" });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 400 if user is missing", async () => {
    const req = createMockReq({ method: "POST", body: { code: "123456" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 if code is missing", async () => {
    const req = createMockReq({ method: "POST", body: { user: "testuser" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 401 if no record found", async () => {
    mockGet.mockReturnValue(undefined);
    const req = createMockReq({ method: "POST", body: { user: "testuser", code: "123456" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Código inválido");
  });

  it("returns 401 if code does not match", async () => {
    mockGet.mockReturnValue({ code: "654321" });
    const req = createMockReq({ method: "POST", body: { user: "testuser", code: "123456" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 200 if code matches", async () => {
    mockGet.mockReturnValue({ code: "123456" });
    const req = createMockReq({ method: "POST", body: { user: "testuser", code: "123456" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.message).toBe("Código validado");
  });
});
