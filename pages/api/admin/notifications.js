import { subscribe } from "../../../lib/notifications";
import { methodNotAllowed } from "../../../lib/apiHelpers";

export default function handler(req, res) {
  const rejected = methodNotAllowed(req, res, ["GET"]);
  if (rejected) return rejected;

  res.writeHead(200, {
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
    "Access-Control-Allow-Origin": "*",
  });

  res.write("retry: 5000\n\n");
  subscribe(res);
}
