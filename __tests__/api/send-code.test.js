import { createMockReq, createMockRes } from "../helpers";

const mockRun = jest.fn();
const mockPrepare = jest.fn(() => ({ run: mockRun }));

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

jest.mock("../../lib/auth", () => ({
  verifyToken: jest.fn(),
}));

import handler from "../../pages/api/send-code";
import { verifyToken } from "../../lib/auth";

describe("pages/api/send-code", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-POST methods", async () => {
    const req = createMockReq({ method: "GET" });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 if no authToken cookie", async () => {
    const req = createMockReq({ method: "POST", cookies: {} });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 if token is invalid", async () => {
    verifyToken.mockReturnValue(null);
    const req = createMockReq({ method: "POST", cookies: { authToken: "bad" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 if user is not admin", async () => {
    verifyToken.mockReturnValue({ role: "user" });
    const req = createMockReq({ method: "POST", cookies: { authToken: "tok" } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 if user field is missing from body", async () => {
    verifyToken.mockReturnValue({ role: "admin" });
    const req = createMockReq({ method: "POST", cookies: { authToken: "tok" }, body: {} });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("inserts otp-p record without generating a code", async () => {
    verifyToken.mockReturnValue({ role: "admin" });
    const req = createMockReq({
      method: "POST",
      cookies: { authToken: "tok" },
      body: { user: "testuser", action: "otp-p", phone: "+1234" },
    });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Solicitud de teléfono registrada");
    expect(mockRun).toHaveBeenCalledWith("testuser", "", "default", "otp-p", "+1234", expect.any(String));
  });

  it("generates a 6-digit code for otp-e action", async () => {
    verifyToken.mockReturnValue({ role: "admin" });
    const req = createMockReq({
      method: "POST",
      cookies: { authToken: "tok" },
      body: { user: "testuser", flow: "LOGIN" },
    });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    // Code is inserted into db
    expect(mockRun).toHaveBeenCalledWith(
      "testuser",
      expect.stringMatching(/^\d{6}$/),
      "LOGIN",
      "otp-e",
      "",
      expect.any(String)
    );
  });
});
