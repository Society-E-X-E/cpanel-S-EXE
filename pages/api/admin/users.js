import { hashSync } from "bcryptjs";
import db from "../../../lib/db";
import { getCurrentUser, publicUser, respondUnauthorized } from "../../../lib/session";
import { ROLES, canChangeRole, canCreateRole, canDeleteUser, canManageUsers } from "../../../lib/panelAuth";

const MIN_PASSWORD_LENGTH = 12;

function validUsername(username) {
  return typeof username === "string" && /^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim());
}

function validEmail(email) {
  return typeof email === "string" && email.length <= 254 && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function getTarget(id) {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return null;
  return db.prepare("SELECT id, username, role FROM staff_users WHERE id = ?").get(numericId) || null;
}

function publicTeamMember(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email || "",
    avatarUrl: user.google_avatar_url || "",
    createdAt: user.created_at,
  };
}

export default function handler(req, res) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ status: "error", message: "Método no permitido" });
  }

  const actor = getCurrentUser(req);
  if (!actor) return respondUnauthorized(res);
  if (!canManageUsers(actor.role)) {
    return res.status(403).json({ status: "error", message: "No tienes permisos para administrar el equipo." });
  }

  if (req.method === "GET") {
    const users = db.prepare(`
      SELECT id, username, role, email,
        (SELECT avatar_url FROM oauth_links WHERE user_id = staff_users.id AND provider = 'google') AS google_avatar_url,
        created_at
      FROM staff_users ORDER BY created_at ASC
    `).all().map(publicTeamMember);
    return res.status(200).json({ status: "ok", users });
  }

  if (req.method === "POST") {
    const { username, password, role, email = "" } = req.body || {};
    if (!validUsername(username) || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > 128 || !validEmail(email) || !ROLES.includes(role)) {
      return res.status(400).json({ status: "error", message: "Ingresa un usuario, correo, rol y contraseña válida (mínimo 12 caracteres)." });
    }
    if (!canCreateRole(actor.role, role)) {
      return res.status(403).json({ status: "error", message: "No puedes asignar ese rol." });
    }
    const existing = db.prepare("SELECT id FROM staff_users WHERE username = ? COLLATE NOCASE").get(username.trim());
    if (existing) return res.status(409).json({ status: "error", message: "Ese nombre de usuario ya está en uso." });

    try {
      const result = db.prepare(`
        INSERT INTO staff_users (username, password_hash, role, email, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(username.trim(), hashSync(password, 12), role, email.trim(), new Date().toISOString());
      const created = db.prepare(`
        SELECT id, username, role, email,
          (SELECT avatar_url FROM oauth_links WHERE user_id = staff_users.id AND provider = 'google') AS google_avatar_url,
          created_at
        FROM staff_users WHERE id = ?
      `).get(result.lastInsertRowid);
      return res.status(201).json({ status: "ok", user: publicTeamMember(created) });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({ status: "error", message: "Ese nombre de usuario ya está en uso." });
      }
      throw error;
    }
  }

  const id = req.body?.id ?? req.query?.id;
  const target = getTarget(id);
  if (!target) return res.status(404).json({ status: "error", message: "Usuario no encontrado." });

  if (req.method === "PATCH") {
    const role = req.body?.role;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ status: "error", message: "Rol no válido." });
    }
    if (!canChangeRole(actor.role, target.role, role)) {
      return res.status(403).json({ status: "error", message: "No puedes cambiar ese rol." });
    }
    db.prepare("UPDATE staff_users SET role = ? WHERE id = ?").run(role, target.id);
    return res.status(200).json({ status: "ok" });
  }

  if (!canDeleteUser(actor.role, target.role, actor.id === target.id)) {
    return res.status(403).json({ status: "error", message: "No puedes eliminar esa cuenta." });
  }
  db.prepare("DELETE FROM staff_users WHERE id = ?").run(target.id);
  return res.status(200).json({ status: "ok" });
}
