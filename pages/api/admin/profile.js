import db from "../../../lib/db";
import { getCurrentUser, publicUser, respondUnauthorized } from "../../../lib/session";

function isText(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}

function validateProfile(body) {
  const { username, firstName, lastName, email, phone, bio } = body || {};
  if (
    !isText(username, 32) ||
    !/^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim()) ||
    !isText(firstName, 80) ||
    !isText(lastName, 80) ||
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

  res.setHeader("Cache-Control", "no-store");
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
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();
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
      SET username = $1,
          first_name = $2,
          last_name = $3,
          email_verified_at = CASE WHEN lower(email) = lower($4) THEN email_verified_at ELSE NULL END,
          email = $4,
          phone = $5,
          bio = $6
      WHERE id = $7
    `, [
      username,
      firstName,
      lastName,
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
    SELECT id, username, role, email, phone, bio, social_links, created_at,
      first_name, last_name, email_verified_at, must_change_password, token_version
    FROM staff_users WHERE id = $1
  `, [user.id]);
  return res.status(200).json({ status: "ok", user: await publicUser(rows[0]) });
}
