import db from "../../lib/db";
import { verifyToken } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Solo POST permitido" });
  }

  const { authToken } = req.cookies;
  if (!authToken) {
    return res.status(401).json({ status: "error", message: "No autorizado" });
  }
  const decoded = verifyToken(authToken);
  if (!decoded || decoded.role !== "admin") {
    return res.status(401).json({ status: "error", message: "Sin permisos" });
  }

  const { user, phone, flow = "default", action = "otp-e" } = req.body;
  if (!user) {
    return res.status(400).json({ status: "error", message: "Falta el usuario" });
  }

  const createdAt = new Date().toISOString();
  if (action === "otp-p") {
    // SQLite table might have code NOT NULL, so insert empty string for OTP-P signals
    db.prepare("INSERT INTO user_codes (username, code, flow, action, created_at, processed) VALUES (?, ?, ?, ?, ?, 0)").run(user, "", flow, action, createdAt);
    console.log(`[send-code] user=${user} action=otp-p flow=${flow} phone=${phone || "(none)"}`);
    return res.status(200).json({ status: "ok", message: "Solicitud de teléfono registrada" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.prepare("INSERT INTO user_codes (username, code, flow, action, created_at, processed) VALUES (?, ?, ?, ?, ?, 0)").run(user, code, flow, action, createdAt);
  console.log(`[send-code] user=${user} action=otp-e flow=${flow} phone=${phone || "(none)"} code=${code}`);
  return res.status(200).json({ status: "ok", message: "Código enviado", code: process.env.NEXT_PUBLIC_DEV_SHOW_CODE === "true" ? code : undefined });
}
