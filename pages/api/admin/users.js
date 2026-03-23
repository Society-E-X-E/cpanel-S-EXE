import { compareSync, hashSync } from "bcryptjs";
import db from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

function requireAdmin(req, res) {
  const { authToken } = req.cookies;
  if (!authToken) {
    res.status(401).json({ status: "error", message: "No autorizado" });
    return null;
  }

  const decoded = verifyToken(authToken);
  if (!decoded || decoded.role !== "admin") {
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
      const users = db.prepare("SELECT id, username, role, created_at FROM users").all();
      return res.status(200).json({ status: "ok", users });
    }

    case "POST": {
      const { username, password, role = "user" } = req.body;
      if (!username || !password) {
        return res.status(400).json({ status: "error", message: "Faltan datos" });
      }

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
      if (existing) {
        return res.status(409).json({ status: "error", message: "Usuario ya existe" });
      }

      const passwordHash = hashSync(password, 10);
      const stmt = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
      const result = stmt.run(username, passwordHash, role);

      return res.status(201).json({ status: "ok", user: { id: result.lastInsertRowid, username, role } });
    }

    case "DELETE": {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ status: "error", message: "ID faltante" });
      }

      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      return res.status(200).json({ status: "ok", message: "Usuario eliminado" });
    }

    default:
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      return res.status(405).json({ status: "error", message: "Método no permitido" });
  }
}
