import { compare } from "bcryptjs";
import db from "../../../lib/db";
import { signToken } from "../../../lib/auth";
import { normalizeRole } from "../../../lib/panelAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ status: "error", message: `Método ${req.method} no permitido` });
  }

  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password || password.length > 128) {
    return res.status(400).json({ status: "error", message: "Credenciales incompletas" });
  }

  try {
    await db.migrate();
    const { rows } = await db.query(`
      SELECT id, username, password_hash, role
      FROM staff_users WHERE lower(username) = lower($1)
    `, [username.trim()]);
    const user = rows[0];

    if (!user || !(await compare(password, user.password_hash))) {
      return res.status(401).json({ status: "error", message: "Acceso denegado" });
    }

    const role = normalizeRole(user.role);
    const token = signToken({ userId: user.id });
    const isProduction = process.env.NODE_ENV === "production";

    res.setHeader(
      "Set-Cookie",
      `authToken=${token}; HttpOnly; Path=/; Max-Age=5400; ${isProduction ? "Secure;" : ""} SameSite=Strict`
    );

    return res.status(200).json({ status: "ok", user: { id: user.id, username: user.username, role } });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ status: "error", message: "No se pudo iniciar sesión por un problema de configuración." });
  }
}