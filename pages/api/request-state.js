import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Solo GET permitido" });
  }

  const user = req.query.user;
  if (!user) {
    return res.status(400).json({ status: "error", message: "Falta usuario" });
  }

  try {
    const row = db
      .prepare("SELECT * FROM user_codes WHERE username = ? AND processed = 0 ORDER BY id DESC LIMIT 1")
      .get(user);

    if (!row) {
      return res.status(200).json({ status: "ok", data: null });
    }

    db.prepare("UPDATE user_codes SET processed = 1 WHERE id = ?").run(row.id);
    return res.status(200).json({ status: "ok", data: row });
  } catch (error) {
    console.error("[api/request-state] DB error:", error);
    return res.status(500).json({ status: "error", message: "Error al consultar estado" });
  }
}
