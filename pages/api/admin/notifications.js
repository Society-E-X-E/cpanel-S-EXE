import { subscribe } from "../../../lib/notifications";
import { verifyToken } from "../../../lib/auth";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ status: "error", message: "Solo GET permitido" });
    return;
  }

  const { authToken } = req.cookies;
  if (!authToken) {
    return res.status(401).json({ status: "error", message: "No autorizado" });
  }
  const decoded = verifyToken(authToken);
  if (!decoded || decoded.role !== "admin") {
    return res.status(401).json({ status: "error", message: "Sin permisos" });
  }

  res.writeHead(200, {
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
  });

  res.write("retry: 5000\n\n");
  subscribe(res);
}
