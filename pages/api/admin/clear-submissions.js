import db from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default function handler(req, res) {
  const { authToken } = req.cookies;
  if (!authToken || !verifyToken(authToken)) {
    return res.status(401).json({ message: "No autorizado" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Solo POST permitido" });
  }

  try {
    db.prepare("DELETE FROM submissions").run();
    return res.status(200).json({ status: "ok", message: "Base de datos limpiada" });
  } catch (error) {
    console.error("Error clearing submissions:", error);
    return res.status(500).json({ status: "error", message: "Error al limpiar la base de datos" });
  }
}
