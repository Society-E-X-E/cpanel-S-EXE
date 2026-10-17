import db from "./db";
import { verifyToken } from "./auth";
import { normalizeRole } from "./panelAuth";

export async function getCurrentUser(req, { allowPasswordChange = false } = {}) {
  const token = req.cookies?.authToken;
  if (!token) return null;

  const claims = verifyToken(token);
  if (!claims?.userId) return null;

  await db.migrate();
  const { rows } = await db.query(`
    SELECT id, username, role, email, phone, bio, social_links, created_at,
      first_name, last_name, email_verified_at, must_change_password, token_version
    FROM staff_users
    WHERE id = $1
  `, [claims.userId]);
  const user = rows[0];

  if (!user || Number(claims.tokenVersion || 0) !== Number(user.token_version || 0)) return null;
  if (user.must_change_password && !allowPasswordChange) return null;
  return { ...user, role: normalizeRole(user.role) };
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
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    role: normalizeRole(user.role),
    email: user.email || "",
    emailVerifiedAt: user.email_verified_at || null,
    phone: user.phone || "",
    avatarUrl: socialAccounts.google?.avatarUrl || "",
    bio: user.bio || "",
    socialAccounts,
    createdAt: user.created_at,
    mustChangePassword: Boolean(user.must_change_password),
  };
}

export function respondUnauthorized(res) {
  return res.status(401).json({ status: "error", message: "Sesión no válida" });
}
