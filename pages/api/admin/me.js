import { verifyToken } from "../../../lib/auth";
import { normalizeRole } from "../../../lib/panelAuth.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Solo GET" });
  }

  const { authToken } = req.cookies;
  if (!authToken) {
    return res.status(401).json({ status: "error", message: "No autorizado" });
  }

  const decoded = verifyToken(authToken);
  if (!decoded) {
    return res.status(401).json({ status: "error", message: "Token inválido" });
  }

  return res.status(200).json({ status: "ok", user: { id: decoded.userId, username: decoded.username, role: normalizeRole(decoded.role) } });
}
