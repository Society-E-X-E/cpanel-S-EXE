import { hashSync } from "bcryptjs";
import db from "../../../lib/db";
import { requireAdmin, methodNotAllowed, apiError, apiSuccess } from "../../../lib/apiHelpers";

export default async function handler(req, res) {
  const user = requireAdmin(req, res);
  if (!user) return;

  const rejected = methodNotAllowed(req, res, ["GET", "POST", "DELETE"]);
  if (rejected) return rejected;

  switch (req.method) {
    case "GET": {
      const users = db.prepare("SELECT id, username, role, first_name, last_name, email, phone, created_at FROM users WHERE role = 'admin'").all();
      return apiSuccess(res, { users });
    }

    case "POST": {
      const { username, password, role = "user" } = req.body;
      if (!username || !password) {
        return apiError(res, 400, "Faltan datos");
      }

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
      if (existing) {
        return apiError(res, 409, "Usuario ya existe");
      }

      const passwordHash = hashSync(password, 10);
      const stmt = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
      const result = stmt.run(username, passwordHash, role);

      return apiSuccess(res, { user: { id: result.lastInsertRowid, username, role } }, 201);
    }

    case "DELETE": {
      const { id } = req.query;
      if (!id) {
        return apiError(res, 400, "ID faltante");
      }

      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      return apiSuccess(res, { message: "Usuario eliminado" });
    }
  }
}
