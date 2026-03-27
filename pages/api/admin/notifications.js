import { subscribe } from "../../../lib/notifications";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ status: "error", message: "Solo GET permitido" });
    return;
  }

  res.writeHead(200, {
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
    "Access-Control-Allow-Origin": "*",
  });

  res.write("retry: 5000\n\n");
  subscribe(res);
}
