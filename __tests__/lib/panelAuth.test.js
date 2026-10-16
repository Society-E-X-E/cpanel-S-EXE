import {
  canChangeRole,
  canCreateRole,
  canDeleteUser,
  canManageUsers,
  normalizeRole,
} from "../../lib/panelAuth";

describe("team role permissions", () => {
  it("limits account creation to the hierarchy", () => {
    expect(canCreateRole("owner", "ceo")).toBe(true);
    expect(canCreateRole("ceo", "admin")).toBe(true);
    expect(canCreateRole("admin", "moderator")).toBe(true);
    expect(canCreateRole("admin", "admin")).toBe(false);
    expect(canCreateRole("moderator", "moderator")).toBe(false);
  });

  it("prevents a CEO from changing or removing the Owner", () => {
    expect(canChangeRole("ceo", "owner", "admin")).toBe(false);
    expect(canDeleteUser("ceo", "owner")).toBe(false);
    expect(canChangeRole("owner", "owner", "admin")).toBe(false);
  });

  it("limits administrators to moderator management", () => {
    expect(canChangeRole("admin", "moderator", "moderator")).toBe(true);
    expect(canChangeRole("admin", "admin", "moderator")).toBe(false);
    expect(canDeleteUser("admin", "moderator")).toBe(true);
    expect(canDeleteUser("admin", "admin")).toBe(false);
    expect(canDeleteUser("owner", "owner", true)).toBe(false);
  });

  it("normalizes unknown roles to the least privileged role", () => {
    expect(normalizeRole("not-a-role")).toBe("moderator");
    expect(canManageUsers("moderator")).toBe(false);
  });
});
