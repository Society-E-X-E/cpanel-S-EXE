const mockQuery = jest.fn();
const mockVerifyToken = jest.fn();

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: { migrate: jest.fn(), query: (...args) => mockQuery(...args) },
}));

jest.mock("../../lib/auth", () => ({
  verifyToken: (...args) => mockVerifyToken(...args),
}));

import { getCurrentUser } from "../../lib/session";

describe("session authorization state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 7, tokenVersion: 3 });
    mockQuery.mockResolvedValue({
      rows: [{
        id: 7,
        role: "moderator",
        must_change_password: false,
        token_version: 3,
      }],
    });
  });

  it("rejects sessions invalidated by a password change", async () => {
    mockVerifyToken.mockReturnValue({ userId: 7, tokenVersion: 2 });
    await expect(getCurrentUser({ cookies: { authToken: "old-token" } })).resolves.toBeNull();
  });

  it("blocks a temporary-password session from normal APIs", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 7, role: "moderator", must_change_password: true, token_version: 3 }],
    });
    await expect(getCurrentUser({ cookies: { authToken: "temporary-token" } })).resolves.toBeNull();
  });

  it("allows temporary-password sessions only when explicitly enabled for the change flow", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 7, role: "moderator", must_change_password: true, token_version: 3 }],
    });
    await expect(
      getCurrentUser({ cookies: { authToken: "temporary-token" } }, { allowPasswordChange: true }),
    ).resolves.toMatchObject({ id: 7, must_change_password: true });
  });
});
