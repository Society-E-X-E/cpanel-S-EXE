import db from "../../../lib/db";
import { getCurrentUser, publicUser, respondUnauthorized } from "../../../lib/session";

const SOCIAL_KEYS = ["github", "gitlab", "linkedin", "google", "x"];

function isText(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}

function isHttpsUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateProfile(body) {
  const { username, email, phone, avatarUrl, bio, socialLinks } = body || {};
  if (
    !isText(username, 32) ||
    !/^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim()) ||
    !isText(email, 254) ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !isText(phone, 40) ||
    !isText(avatarUrl, 2048) ||
    !isHttpsUrl(avatarUrl) ||
    !isText(bio, 500) ||
    !socialLinks ||
    typeof socialLinks !== "object" ||
    Array.isArray(socialLinks)
  ) {
    return false;
  }

  return SOCIAL_KEYS.every((key) => (
    Object.prototype.hasOwnProperty.call(socialLinks, key) &&
    isText(socialLinks[key], 2048) &&
    isHttpsUrl(socialLinks[key])
  )) && Object.keys(socialLinks).every((key) => SOCIAL_KEYS.includes(key));
}

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ status: "error", message: "Método no permitido" });
  }

  const user = getCurrentUser(req);
  if (!user) return respondUnauthorized(res);

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", user: publicUser(user) });
  }

  const profile = req.body;
  if (!validateProfile(profile)) {
    return res.status(400).json({ status: "error", message: "Revisa los campos del perfil y usa enlaces HTTPS." });
  }

  const username = profile.username.trim();
  const duplicate = db.prepare("SELECT id FROM staff_users WHERE username = ? COLLATE NOCASE AND id != ?")
    .get(username, user.id);
  if (duplicate) {
    return res.status(409).json({ status: "error", message: "Ese nombre de usuario ya está en uso." });
  }

  db.prepare(`
    UPDATE staff_users
    SET username = ?, email = ?, phone = ?, avatar_url = ?, bio = ?, social_links = ?
    WHERE id = ?
  `).run(
    username,
    profile.email.trim(),
    profile.phone.trim(),
    profile.avatarUrl.trim(),
    profile.bio.trim(),
    JSON.stringify(profile.socialLinks),
    user.id,
  );

  const updated = db.prepare(`
    SELECT id, username, role, email, phone, avatar_url, bio, social_links, created_at
    FROM staff_users WHERE id = ?
  `).get(user.id);
  return res.status(200).json({ status: "ok", user: publicUser(updated) });
}
