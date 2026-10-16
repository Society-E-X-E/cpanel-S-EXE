export const ROLES = ["owner", "ceo", "admin", "moderator"];

export const ROLE_LABELS = {
  owner: "Owner · CTO",
  ceo: "CEO",
  admin: "Administrador",
  moderator: "Moderador",
};

export function normalizeRole(role) {
  const normalized = String(role || "").toLowerCase();
  return ROLES.includes(normalized) ? normalized : "moderator";
}

export function canCreateRole(actorRole, targetRole) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (target === "owner") return false;
  if (target === "ceo") return actor === "owner";
  if (target === "admin") return actor === "owner" || actor === "ceo";
  return actor === "owner" || actor === "ceo" || actor === "admin";
}

export function canChangeRole(actorRole, targetRole, nextRole) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  const next = normalizeRole(nextRole);

  if (actor === "owner") {
    if (target === "owner") return next === "owner";
    return next !== "owner";
  }
  if (target === "owner" || target === "ceo" || next === "owner" || next === "ceo") return false;
  if (actor === "ceo") return true;
  return actor === "admin" && target === "moderator" && next === "moderator";
}

export function canDeleteUser(actorRole, targetRole, isSelf = false) {
  if (isSelf) return false;
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (actor === "owner") return true;
  if (target === "owner" || target === "ceo") return false;
  if (actor === "ceo") return true;
  return actor === "admin" && target === "moderator";
}

export function canManageUsers(role) {
  return ["owner", "ceo", "admin"].includes(normalizeRole(role));
}
