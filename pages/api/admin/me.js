import { getCurrentUser, publicUser, respondUnauthorized } from "../../../lib/session";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Solo GET" });
  }

  const user = getCurrentUser(req);
  if (!user) return respondUnauthorized(res);
  return res.status(200).json({ status: "ok", user: publicUser(user) });
}
