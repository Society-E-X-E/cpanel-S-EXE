import { getCurrentUser, publicUser, respondUnauthorized } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Solo GET" });
  }

  res.setHeader("Cache-Control", "no-store");
  const user = await getCurrentUser(req, { allowPasswordChange: true });
  if (!user) return respondUnauthorized(res);
  return res.status(200).json({ status: "ok", user: await publicUser(user) });
}
