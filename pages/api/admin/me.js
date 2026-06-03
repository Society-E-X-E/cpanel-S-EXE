import { methodNotAllowed, requireAuth, apiSuccess } from "../../../lib/apiHelpers";

export default function handler(req, res) {
  const rejected = methodNotAllowed(req, res, ["GET"]);
  if (rejected) return rejected;

  const decoded = requireAuth(req, res);
  if (!decoded) return;

  return apiSuccess(res, { user: { id: decoded.userId, username: decoded.username, role: decoded.role } });
}
