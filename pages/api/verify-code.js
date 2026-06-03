import db from "../../lib/db";
import { methodNotAllowed, apiError, apiSuccess } from "../../lib/apiHelpers";

export default async function handler(req, res) {
  const rejected = methodNotAllowed(req, res, ["POST"]);
  if (rejected) return rejected;

  const { user, code } = req.body;
  if (!user || !code) {
    return apiError(res, 400, "Faltan datos");
  }

  const record = db.prepare("SELECT * FROM user_codes WHERE username = ? ORDER BY id DESC LIMIT 1").get(user);
  if (!record || record.code !== code) {
    return apiError(res, 401, "Código inválido");
  }

  return apiSuccess(res, { message: "Código validado" });
}
