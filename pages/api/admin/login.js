import { compareSync } from "bcryptjs";
import db from "../../../lib/db";
import { signToken } from "../../../lib/auth";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Solo POST" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: "error", message: "Faltan datos" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !compareSync(password, user.password_hash)) {
    return res.status(401).json({ status: "error", message: "Credenciales inválidas" });
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  res.setHeader("Set-Cookie", `authToken=${token}; HttpOnly; Path=/; Max-Age=3600; Secure=${process.env.NODE_ENV === "production"}; SameSite=Strict`);
  return res.status(200).json({ status: "ok", message: "Autenticación admin exitosa" });
}
