import db from "../../../lib/db";
import { getCurrentUser, publicUser, respondUnauthorized } from "../../../lib/session";

function isText(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}

function validateProfile(body) {
  const { username, email, phone, bio } = body || {};
  if (
    !isText(username, 32) ||
    !/^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim()) ||
    !isText(email, 254) ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !isText(phone, 40) ||
    !isText(bio, 500)
  ) {
    return false;
  }

  return true;
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
    return res.status(400).json({ status: "error", message: "Revisa los campos del perfil e inténtalo de nuevo." });
  }

  const username = profile.username.trim();
  const duplicate = db.prepare("SELECT id FROM staff_users WHERE username = ? COLLATE NOCASE AND id != ?")
    .get(username, user.id);
  if (duplicate) {
    return res.status(409).json({ status: "error", message: "Ese nombre de usuario ya está en uso." });
  }

  db.prepare(`
    UPDATE staff_users
    SET username = ?, email = ?, phone = ?, bio = ?
    WHERE id = ?
  `).run(
    username,
    profile.email.trim(),
    profile.phone.trim(),
    profile.bio.trim(),
    user.id,
  );

  const updated = db.prepare(`
    SELECT id, username, role, email, phone, bio, social_links, created_at
    FROM staff_users WHERE id = ?
  `).get(user.id);
  return res.status(200).json({ status: "ok", user: publicUser(updated) });
}
