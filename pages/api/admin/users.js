import { hash } from "bcryptjs";
import db from "../../../lib/db";
import { getCurrentUser, respondUnauthorized } from "../../../lib/session";
import { ROLES, canChangeRole, canCreateRole, canDeleteUser, canManageUsers } from "../../../lib/panelAuth";

const MIN_PASSWORD_LENGTH = 12;

function validUsername(username) {
  return typeof username === "string" && /^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim());
}

function validEmail(email) {
  return typeof email === "string" && email.length <= 254 && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function validName(name) {
  return typeof name === "string" && name.length <= 80;
}

async function getTarget(id) {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return null;
  const { rows } = await db.query("SELECT id, username, role FROM staff_users WHERE id = $1", [numericId]);
  return rows[0] || null;
}

function publicTeamMember(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    email: user.email || "",
    emailVerifiedAt: user.email_verified_at || null,
    phone: user.phone || "",
    bio: user.bio || "",
    avatarUrl: user.google_avatar_url || "",
    connectedAuths: user.connected_auths || [],
    createdAt: user.created_at,
  };
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ status: "error", message: "Método no permitido" });
  }

  res.setHeader("Cache-Control", "no-store");
  const actor = await getCurrentUser(req);
  if (!actor) return respondUnauthorized(res);

  if (req.method === "GET") {
    const { rows } = await db.query(`
      SELECT id, username, role, email, first_name, last_name, phone, bio, email_verified_at,
        (SELECT avatar_url FROM oauth_links WHERE user_id = staff_users.id AND provider = 'google') AS google_avatar_url,
        (SELECT COALESCE(json_agg(json_build_object(
          'provider', provider,
          'displayName', display_name,
          'username', username,
          'profileUrl', profile_url
        ) ORDER BY provider), '[]'::json)
        FROM oauth_links WHERE user_id = staff_users.id) AS connected_auths,
        created_at
      FROM staff_users ORDER BY created_at ASC
    `);
    const users = rows.map(publicTeamMember);
    return res.status(200).json({ status: "ok", users });
  }

  if (!canManageUsers(actor.role)) {
    return res.status(403).json({ status: "error", message: "No tienes permisos para administrar el equipo." });
  }

  if (req.method === "POST") {
    const { username, firstName = "", lastName = "", password, role, email = "" } = req.body || {};
    if (!validUsername(username) || !validName(firstName) || !validName(lastName) || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > 128 || !validEmail(email) || !ROLES.includes(role)) {
      return res.status(400).json({ status: "error", message: "Ingresa un usuario, correo, rol y contraseña válida (mínimo 12 caracteres)." });
    }
    if (!canCreateRole(actor.role, role)) {
      return res.status(403).json({ status: "error", message: "No puedes asignar ese rol." });
    }

    try {
      const { rows } = await db.query(`
        INSERT INTO staff_users (username, first_name, last_name, password_hash, role, email, must_change_password, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
        RETURNING id, username, role, email,
          (SELECT avatar_url FROM oauth_links WHERE user_id = staff_users.id AND provider = 'google') AS google_avatar_url,
          created_at
      `, [
        username.trim(),
        firstName.trim(),
        lastName.trim(),
        await hash(password, 12),
        role,
        email.trim(),
        new Date().toISOString(),
      ]);
      return res.status(201).json({ status: "ok", user: publicTeamMember(rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ status: "error", message: "Ese nombre de usuario ya está en uso." });
      }
      throw error;
    }
  }

  const id = req.body?.id ?? req.query?.id;
  const target = await getTarget(id);
  if (!target) return res.status(404).json({ status: "error", message: "Usuario no encontrado." });

  if (req.method === "PATCH") {
    const role = req.body?.role;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ status: "error", message: "Rol no válido." });
    }
    if (!canChangeRole(actor.role, target.role, role)) {
      return res.status(403).json({ status: "error", message: "No puedes cambiar ese rol." });
    }
    await db.query("UPDATE staff_users SET role = $1 WHERE id = $2", [role, target.id]);
    return res.status(200).json({ status: "ok" });
  }

  if (!canDeleteUser(actor.role, target.role, actor.id === target.id)) {
    return res.status(403).json({ status: "error", message: "No puedes eliminar esa cuenta." });
  }
  await db.query("DELETE FROM staff_users WHERE id = $1", [target.id]);
  return res.status(200).json({ status: "ok" });
}
