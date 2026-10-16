import { createMockReq, createMockRes } from "../../helpers";

const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();
const mockPrepare = jest.fn(() => ({ get: mockGet, all: mockAll, run: mockRun }));

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

jest.mock("../../../lib/session", () => ({
  getCurrentUser: jest.fn(),
  publicUser: jest.fn((user) => user),
  respondUnauthorized: jest.fn((res) => res.status(401).json({ status: "error" })),
}));

jest.mock("bcryptjs", () => ({
  hashSync: jest.fn(() => "hashed"),
}));

import handler from "../../../pages/api/admin/users";
import { getCurrentUser } from "../../../lib/session";

describe("team account management authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not allow moderators to manage accounts", () => {
    getCurrentUser.mockReturnValue({ id: 5, role: "moderator" });
    const res = createMockRes();
    handler(createMockReq({ method: "GET" }), res);
    expect(res.statusCode).toBe(403);
  });

  it("does not allow an administrator to create an admin", () => {
    getCurrentUser.mockReturnValue({ id: 1, role: "admin" });
    const res = createMockRes();
    handler(createMockReq({
      method: "POST",
      body: { username: "newadmin", password: "sufficiently-long", role: "admin" },
    }), res);
    expect(res.statusCode).toBe(403);
  });

  it("does not allow a CEO to change an Owner role", () => {
    getCurrentUser.mockReturnValue({ id: 2, role: "ceo" });
    mockGet.mockReturnValue({ id: 1, username: "owner", role: "owner" });
    const res = createMockRes();
    handler(createMockReq({ method: "PATCH", body: { id: 1, role: "admin" } }), res);
    expect(res.statusCode).toBe(403);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("allows an administrator to create a moderator", () => {
    getCurrentUser.mockReturnValue({ id: 1, role: "admin" });
    mockGet.mockReturnValueOnce(undefined).mockReturnValueOnce({
      id: 3, username: "newmod", role: "moderator", email: "", phone: "", avatar_url: "", bio: "", social_links: "{}", created_at: "now",
    });
    mockRun.mockReturnValue({ lastInsertRowid: 3 });
    const res = createMockRes();
    handler(createMockReq({
      method: "POST",
      body: { username: "newmod", password: "sufficiently-long", role: "moderator" },
    }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe("moderator");
  });
});
