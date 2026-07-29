import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET = process.env.PANEL_ENCRYPTION_KEY || "cpanel-default-key-2026";

function getKey() {
  return crypto.createHash("sha256").update(String(SECRET)).digest();
}

export function encryptValue(value) {
  if (value === null || value === undefined) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

export function decryptValue(value) {
  if (!value) return "";
  const [ivHex, contentHex, tagHex] = String(value).split(":");
  if (!ivHex || !contentHex || !tagHex) return value;

  try {
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(contentHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    return String(value);
  }
}

export function normalizeRole(role) {
  const normalized = String(role || "admin").toLowerCase();
  if (normalized === "owner" || normalized === "developer" || normalized === "admin") {
    return normalized;
  }
  return "admin";
}

export function hasRoleAccess(userRole, allowedRoles = []) {
  const normalizedRole = normalizeRole(userRole);
  return allowedRoles.map((role) => normalizeRole(role)).includes(normalizedRole);
}

export function canManageRole(currentUserRole, targetRole, action = "assign") {
  const actor = normalizeRole(currentUserRole);
  const target = normalizeRole(targetRole);

  if (actor === "owner") return true;
  if (actor === "developer") {
    if (target === "owner") return false;
    if (action === "assign") return target === "developer" || target === "admin";
    if (action === "modify") return target === "developer" || target === "admin";
    return false;
  }
  return false;
}

export function canDeleteUser(currentUserRole, targetUserRole) {
  const actor = normalizeRole(currentUserRole);
  const target = normalizeRole(targetUserRole);

  if (actor === "owner") return true;
  if (actor === "developer") return target !== "owner";
  return false;
}

export function canEditOwnRole(currentUserRole, targetUserRole) {
  const actor = normalizeRole(currentUserRole);
  const target = normalizeRole(targetUserRole);

  if (actor === "owner") return true;
  if (actor === "developer") return actor === target;
  return false;
}
