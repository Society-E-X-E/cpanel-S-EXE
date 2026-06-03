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
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    try {
      const logs = db.prepare("SELECT l.id, l.admin_id, u.username as admin_username, l.action, l.details, l.created_at FROM action_logs l LEFT JOIN users u ON u.id = l.admin_id ORDER BY l.created_at DESC LIMIT 100").all();
      return res.status(200).json({ status: "ok", logs });
    } catch (error) {
      console.error("[api/admin/action-logs] GET error:", error);
      return res.status(500).json({ status: "error", message: "Error al obtener logs" });
    }
  }

  if (req.method === "POST") {
    const { action, details } = req.body;
    if (!action) {
      return res.status(400).json({ status: "error", message: "Acción requerida" });
    }

    try {
      const { publish } = await import("../../../lib/notifications");
      const now = new Date().toISOString();
      db.prepare("INSERT INTO action_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, ?)").run(admin.userId || admin.id || admin.id, action, details || "", now);

      publish("dashboard-action", { admin: admin.username, action, details, created_at: now });

      return res.status(201).json({ status: "ok" });
    } catch (error) {
      console.error("[api/admin/action-logs] POST error:", error);
      return res.status(500).json({ status: "error", message: "Error al registrar log" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ status: "error", message: "Método no permitido" });
}
