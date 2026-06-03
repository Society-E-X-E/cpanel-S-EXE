import { compareSync } from "bcryptjs";
import db from "../../../lib/db";
import { signToken } from "../../../lib/auth";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ status: "error", message: `Método ${req.method} no permitido` });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: "error", message: "Credenciales incompletas" });
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (!user || !compareSync(password, user.password_hash)) {
      return res.status(401).json({ status: "error", message: "Acceso denegado" });
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role });

    const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `authToken=${token}; HttpOnly; Path=/; Max-Age=3600${secureCookie}; SameSite=Strict`);
    
    return res.status(200).json({ status: "ok", message: "Sesión iniciada correctamente" });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
}