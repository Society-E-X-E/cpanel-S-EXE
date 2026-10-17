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

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ status: "error", message: "Método no permitido" });
  }

  const user = await getCurrentUser(req);
  if (!user) return respondUnauthorized(res);

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", user: await publicUser(user) });
  }

  const profile = req.body;
  if (!validateProfile(profile)) {
    return res.status(400).json({ status: "error", message: "Revisa los campos del perfil e inténtalo de nuevo." });
  }

  const username = profile.username.trim();
  const duplicateResult = await db.query(
    "SELECT id FROM staff_users WHERE lower(username) = lower($1) AND id <> $2",
    [username, user.id],
  );
  const duplicate = duplicateResult.rows[0];
  if (duplicate) {
    return res.status(409).json({ status: "error", message: "Ese nombre de usuario ya está en uso." });
  }

  try {
    await db.query(`
      UPDATE staff_users
      SET username = $1, email = $2, phone = $3, bio = $4
      WHERE id = $5
    `, [
      username,
      profile.email.trim(),
      profile.phone.trim(),
      profile.bio.trim(),
      user.id,
    ]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ status: "error", message: "Ese nombre de usuario ya está en uso." });
    }
    throw error;
  }

  const { rows } = await db.query(`
    SELECT id, username, role, email, phone, bio, social_links, created_at
    FROM staff_users WHERE id = $1
  `, [user.id]);
  return res.status(200).json({ status: "ok", user: await publicUser(rows[0]) });
}
