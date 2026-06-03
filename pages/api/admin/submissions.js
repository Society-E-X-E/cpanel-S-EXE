import db from "../../../lib/db";
import { requireAuth, apiError, apiSuccess } from "../../../lib/apiHelpers";

export default function handler(req, res) {
  const decoded = requireAuth(req, res);
  if (!decoded) return;

  try {
    const submissions = db.prepare(`
      SELECT * FROM submissions 
      ORDER BY server_timestamp DESC 
      LIMIT 100
    `).all();

    return apiSuccess(res, { submissions });
  } catch (error) {
    return apiError(res, 500, "Error al obtener datos");
  }
}
