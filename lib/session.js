import db from "./db";
import { verifyToken } from "./auth";
import { normalizeRole } from "./panelAuth";

export async function getCurrentUser(req) {
  const token = req.cookies?.authToken;
  if (!token) return null;

  const claims = verifyToken(token);
  if (!claims?.userId) return null;

  await db.migrate();
  const { rows } = await db.query(`
    SELECT id, username, role, email, phone, bio, social_links, created_at
    FROM staff_users
    WHERE id = $1
  `, [claims.userId]);
  const user = rows[0];

  return user ? { ...user, role: normalizeRole(user.role) } : null;
}

export async function publicUser(user) {
  const { rows } = await db.query(`
    SELECT provider, display_name, username, profile_url, avatar_url, created_at
    FROM oauth_links WHERE user_id = $1 ORDER BY provider
  `, [user.id]);
  const socialAccounts = rows.reduce((accounts, account) => {
    accounts[account.provider] = {
      displayName: account.display_name,
      username: account.username,
      profileUrl: account.profile_url,
      avatarUrl: account.avatar_url || "",
      connectedAt: account.created_at,
    };
    return accounts;
  }, {});

  return {
    id: user.id,
    username: user.username,
    role: normalizeRole(user.role),
    email: user.email || "",
    phone: user.phone || "",
    avatarUrl: socialAccounts.google?.avatarUrl || "",
    bio: user.bio || "",
    socialAccounts,
    createdAt: user.created_at,
  };
}

export function respondUnauthorized(res) {
  return res.status(401).json({ status: "error", message: "Sesión no válida" });
}
