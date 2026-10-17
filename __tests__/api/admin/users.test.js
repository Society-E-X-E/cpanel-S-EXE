import { createMockReq, createMockRes } from "../../helpers";

const mockQuery = jest.fn();

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { migrate: jest.fn(), query: (...args) => mockQuery(...args) },
}));

jest.mock("../../../lib/session", () => ({
  getCurrentUser: jest.fn(),
  publicUser: jest.fn((user) => user),
  respondUnauthorized: jest.fn((res) => res.status(401).json({ status: "error" })),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(async () => "hashed"),
}));

import handler from "../../../pages/api/admin/users";
import { getCurrentUser } from "../../../lib/session";

describe("team account management authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("allows moderators to view member profiles without management permissions", async () => {
    getCurrentUser.mockReturnValue({ id: 5, role: "moderator" });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, username: "member", role: "moderator", connected_auths: [] }] });
    const res = createMockRes();
    await handler(createMockReq({ method: "GET" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.users[0].connectedAuths).toEqual([]);
  });

  it("does not allow moderators to create accounts", async () => {
    getCurrentUser.mockReturnValue({ id: 5, role: "moderator" });
    const res = createMockRes();
    await handler(createMockReq({ method: "POST", body: {} }), res);
    expect(res.statusCode).toBe(403);
  });

  it("does not allow an administrator to create an admin", async () => {
    getCurrentUser.mockReturnValue({ id: 1, role: "admin" });
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { username: "newadmin", password: "sufficiently-long", role: "admin" },
    }), res);
    expect(res.statusCode).toBe(403);
  });

  it("does not allow a CEO to change an Owner role", async () => {
    getCurrentUser.mockReturnValue({ id: 2, role: "ceo" });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: "owner", role: "owner" }] });
    const res = createMockRes();
    await handler(createMockReq({ method: "PATCH", body: { id: 1, role: "admin" } }), res);
    expect(res.statusCode).toBe(403);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("allows an administrator to create a moderator", async () => {
    getCurrentUser.mockReturnValue({ id: 1, role: "admin" });
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 3, username: "newmod", role: "moderator", email: "", phone: "", avatar_url: "", bio: "", social_links: "{}", created_at: "now",
      }],
    });
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { username: "newmod", password: "sufficiently-long", role: "moderator" },
    }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe("moderator");
    expect(mockQuery.mock.calls[0][0]).toContain("must_change_password");
  });
});
