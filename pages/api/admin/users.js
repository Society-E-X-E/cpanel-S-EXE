import { hashSync } from "bcryptjs";
import db from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";
import {
  decryptValue,
  encryptValue,
  normalizeRole,
  hasRoleAccess,
  canManageRole,
  canDeleteUser,
  canEditOwnRole,
} from "../../../lib/panelAuth.js";

function requireAdmin(req, res, allowedRoles = ["owner", "developer", "admin"]) {
  const { authToken } = req.cookies;
  if (!authToken) {
    res.status(401).json({ status: "error", message: "No autorizado" });
    return null;
  }

  const decoded = verifyToken(authToken);
  if (!decoded || !hasRoleAccess(decoded.role, allowedRoles)) {
    res.status(401).json({ status: "error", message: "Sin permisos" });
    return null;
  }

  return decoded;
}

export default async function handler(req, res) {
  const user = requireAdmin(req, res);
  if (!user) {
    return;
  }

  switch (req.method) {
    case "GET": {
      const users = db.prepare("SELECT id, username, role, first_name, last_name, email, phone, created_at FROM users").all();
      const normalizedUsers = users.map((user) => ({ ...user, username: decryptValue(user.username), role: normalizeRole(user.role) }));
      return res.status(200).json({ status: "ok", users: normalizedUsers });
    }

    case "POST": {
      const { username, password, role = "admin" } = req.body;
      if (!username || !password) {
        return res.status(400).json({ status: "error", message: "Faltan datos" });
      }

      if (!canManageRole(user.role, role, "assign")) {
        return res.status(403).json({ status: "error", message: "No tienes permisos para asignar ese rol" });
      }

      const existingUsers = db.prepare("SELECT id, username FROM users").all();
      const exists = existingUsers.some((candidate) => decryptValue(candidate.username) === username);
      if (exists) {
        return res.status(409).json({ status: "error", message: "Usuario ya existe" });
      }

      const passwordHash = hashSync(password, 10);
      const normalizedRole = normalizeRole(role);
      const encryptedUsername = encryptValue(username);
      const stmt = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
      const result = stmt.run(encryptedUsername, passwordHash, normalizedRole);

      return res.status(201).json({ status: "ok", user: { id: result.lastInsertRowid, username, role: normalizedRole } });
    }

    case "DELETE": {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ status: "error", message: "ID faltante" });
      }

      const targetUser = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id);
      if (!targetUser) {
        return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
      }

      if (!canDeleteUser(user.role, targetUser.role)) {
        return res.status(403).json({ status: "error", message: "No tienes permisos para eliminar este usuario" });
      }

      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      return res.status(200).json({ status: "ok", message: "Usuario eliminado" });
    }

    default:
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      return res.status(405).json({ status: "error", message: "Método no permitido" });
  }
}
