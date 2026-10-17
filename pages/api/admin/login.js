import { compare } from "bcryptjs";
import db from "../../../lib/db";
import { signToken } from "../../../lib/auth";
import { normalizeRole } from "../../../lib/panelAuth.js";
import {
  clearUsernameLoginFailures,
  isLoginRateLimited,
  recordFailedLogin,
} from "../../../lib/loginRateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ status: "error", message: `Método ${req.method} no permitido` });
  }

  res.setHeader("Cache-Control", "no-store");
  const { username, password } = req.body || {};
  if (typeof username !== "string" || username.trim().length > 32 || typeof password !== "string" || !username.trim() || !password || password.length > 128) {
    return res.status(400).json({ status: "error", message: "Credenciales incompletas" });
  }

  try {
    await db.migrate();
    if (await isLoginRateLimited(req, username)) {
      return res.status(429).json({ status: "error", message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar." });
    }
    const { rows } = await db.query(`
      SELECT id, username, password_hash, role, must_change_password, token_version
      FROM staff_users WHERE lower(username) = lower($1)
    `, [username.trim()]);
    const user = rows[0];

    if (!user || !(await compare(password, user.password_hash))) {
      await recordFailedLogin(req, username);
      return res.status(401).json({ status: "error", message: "Acceso denegado" });
    }

    await clearUsernameLoginFailures(req, username);
    const role = normalizeRole(user.role);
    const token = signToken({ userId: user.id, tokenVersion: user.token_version || 0 });
    const isProduction = process.env.NODE_ENV === "production";

    res.setHeader(
      "Set-Cookie",
      `authToken=${token}; HttpOnly; Path=/; Max-Age=5400; ${isProduction ? "Secure;" : ""} SameSite=Strict`
    );

    return res.status(200).json({
      status: "ok",
      mustChangePassword: Boolean(user.must_change_password),
      user: { id: user.id, username: user.username, role },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ status: "error", message: "No se pudo iniciar sesión por un problema de configuración." });
  }
}