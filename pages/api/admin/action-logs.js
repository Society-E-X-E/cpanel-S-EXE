import db from "../../../lib/db";
import { requireAdmin, methodNotAllowed, apiError, apiSuccess } from "../../../lib/apiHelpers";

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const rejected = methodNotAllowed(req, res, ["GET", "POST"]);
  if (rejected) return rejected;

  if (req.method === "GET") {
    const logs = db.prepare("SELECT l.id, l.admin_id, u.username as admin_username, l.action, l.details, l.created_at FROM action_logs l LEFT JOIN users u ON u.id = l.admin_id ORDER BY l.created_at DESC LIMIT 100").all();
    return apiSuccess(res, { logs });
  }

  if (req.method === "POST") {
    const { publish } = await import("../../../lib/notifications");
    const { action, details } = req.body;
    if (!action) {
      return apiError(res, 400, "Acción requerida");
    }

    const now = new Date().toISOString();
    db.prepare("INSERT INTO action_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, ?)").run(admin.userId || admin.id || admin.id, action, details || "", now);

    publish("dashboard-action", { admin: admin.username, action, details, created_at: now });

    return apiSuccess(res, {}, 201);
  }
}
