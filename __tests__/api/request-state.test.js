import { createMockReq, createMockRes } from "../helpers";

const mockGet = jest.fn();
const mockRun = jest.fn();
const mockPrepare = jest.fn((sql) => {
  if (sql.includes("UPDATE")) return { run: mockRun };
  return { get: mockGet };
});

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

import handler from "../../pages/api/request-state";

describe("pages/api/request-state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-GET methods", async () => {
    const req = createMockReq({ method: "POST" });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 400 if user query param is missing", async () => {
    const req = createMockReq({ method: "GET", query: {} });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns data: null when no unprocessed row exists", async () => {
    mockGet.mockReturnValue(undefined);
    const req = createMockReq({ method: "GET", query: { user: "testuser" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("returns the row and marks it as processed", async () => {
    const row = { id: 5, username: "testuser", code: "123456", flow: "LOGIN", action: "otp-e", processed: 0 };
    mockGet.mockReturnValue(row);
    const req = createMockReq({ method: "GET", query: { user: "testuser" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(row);
    expect(mockRun).toHaveBeenCalledWith(5);
  });
});
