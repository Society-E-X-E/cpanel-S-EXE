import db from "./db";
import { verifyToken } from "./auth";
import { normalizeRole } from "./panelAuth";

export function getCurrentUser(req) {
  const token = req.cookies?.authToken;
  if (!token) return null;

  const claims = verifyToken(token);
  if (!claims?.userId) return null;

  const user = db.prepare(`
    SELECT id, username, role, email, phone, avatar_url, bio, social_links, created_at
    FROM staff_users
    WHERE id = ?
  `).get(claims.userId);

  return user ? { ...user, role: normalizeRole(user.role) } : null;
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: normalizeRole(user.role),
    email: user.email || "",
    phone: user.phone || "",
    avatarUrl: user.avatar_url || "",
    bio: user.bio || "",
    socialLinks: JSON.parse(user.social_links || "{}"),
    createdAt: user.created_at,
  };
}

export function respondUnauthorized(res) {
  return res.status(401).json({ status: "error", message: "Sesión no válida" });
}
