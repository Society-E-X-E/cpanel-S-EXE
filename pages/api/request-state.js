import db from "../../lib/db";
import { methodNotAllowed, apiError, apiSuccess } from "../../lib/apiHelpers";

export default async function handler(req, res) {
  const rejected = methodNotAllowed(req, res, ["GET"]);
  if (rejected) return rejected;

  const user = req.query.user;
  if (!user) {
    return apiError(res, 400, "Falta usuario");
  }

  const row = db
    .prepare("SELECT * FROM user_codes WHERE username = ? AND processed = 0 ORDER BY id DESC LIMIT 1")
    .get(user);

  if (!row) {
    return apiSuccess(res, { data: null });
  }

  db.prepare("UPDATE user_codes SET processed = 1 WHERE id = ?").run(row.id);
  return apiSuccess(res, { data: row });
}
