import { createMockReq, createMockRes } from "../../helpers";

const mockQuery = jest.fn();
const mockClaimOtpRequestLimit = jest.fn();
const mockConsumeOtp = jest.fn();

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { migrate: jest.fn(), query: (...args) => mockQuery(...args) },
}));

jest.mock("../../../lib/mailer", () => ({
  validateEmailConfiguration: jest.fn(),
}));

jest.mock("../../../lib/emailOtp", () => ({
  claimOtpRequestLimit: (...args) => mockClaimOtpRequestLimit(...args),
  consumeOtp: (...args) => mockConsumeOtp(...args),
  createAndSendOtp: jest.fn(),
  isValidOtp: (value) => typeof value === "string" && /^\d{8}$/.test(value),
  validateOtpConfiguration: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(async () => "new-password-hash"),
}));

import handler from "../../../pages/api/admin/password-reset";

describe("email password recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClaimOtpRequestLimit.mockResolvedValue(true);
    mockConsumeOtp.mockResolvedValue(false);
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("returns the same generic response when no verified account matches", async () => {
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { action: "request", email: "unknown@example.com" },
    }), res);

    expect(res.statusCode).toBe(202);
    expect(res.body.message).toContain("Si existe una cuenta");
  });

  it("does not change a password when the email code is invalid", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7, email: "member@example.com" }] });
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { action: "confirm", email: "member@example.com", code: "12345678", newPassword: "a-new-secure-password" },
    }), res);

    expect(res.statusCode).toBe(400);
    expect(mockConsumeOtp).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("resets a password and invalidates existing sessions after a valid code", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 7, email: "member@example.com" }] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] });
    mockConsumeOtp.mockResolvedValue(true);
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { action: "confirm", email: "member@example.com", code: "12345678", newPassword: "a-new-secure-password" },
    }), res);

    expect(res.statusCode).toBe(200);
    expect(mockQuery.mock.calls[1][0]).toContain("token_version = token_version + 1");
  });
});
