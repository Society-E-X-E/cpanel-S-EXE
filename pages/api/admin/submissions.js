import db from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default function handler(req, res) {
  // 1. Verificar autenticación del Admin
  const { authToken } = req.cookies;
  if (!authToken || !verifyToken(authToken)) {
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    // 2. Obtener las últimas capturas
    const submissions = db.prepare(`
      SELECT * FROM submissions 
      ORDER BY server_timestamp DESC 
      LIMIT 100
    `).all();

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("[api/admin/submissions] DB error:", error);
    return res.status(500).json({ status: "error", message: "Error al obtener datos" });
  }
}