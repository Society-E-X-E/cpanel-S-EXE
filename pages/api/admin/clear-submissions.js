import db from "../../../lib/db";
import { requireAuth, methodNotAllowed, apiError, apiSuccess } from "../../../lib/apiHelpers";

export default function handler(req, res) {
  const decoded = requireAuth(req, res);
  if (!decoded) return;

  const rejected = methodNotAllowed(req, res, ["POST"]);
  if (rejected) return rejected;

  try {
    db.prepare("DELETE FROM submissions").run();
    return apiSuccess(res, { message: "Base de datos limpiada" });
  } catch (error) {
    console.error("Error clearing submissions:", error);
    return apiError(res, 500, "Error al limpiar la base de datos");
  }
}
