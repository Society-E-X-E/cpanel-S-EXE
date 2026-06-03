import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Solo POST permitido" });
  }

  const { user, code } = req.body;
  if (!user || !code) {
    return res.status(400).json({ status: "error", message: "Faltan datos" });
  }

  try {
    const record = db.prepare("SELECT * FROM user_codes WHERE username = ? ORDER BY id DESC LIMIT 1").get(user);
    if (!record || record.code !== code) {
      return res.status(401).json({ status: "error", message: "Código inválido" });
    }

    return res.status(200).json({ status: "ok", message: "Código validado" });
  } catch (error) {
    console.error("[api/verify-code] DB error:", error);
    return res.status(500).json({ status: "error", message: "Error al verificar código" });
  }
}
