import { compareSync } from "bcryptjs";
import db from "../../../lib/db";
import { signToken } from "../../../lib/auth";
import { methodNotAllowed, apiError, apiSuccess } from "../../../lib/apiHelpers";

export default function handler(req, res) {
  const rejected = methodNotAllowed(req, res, ["POST"]);
  if (rejected) return rejected;

  const { username, password } = req.body;
  if (!username || !password) {
    return apiError(res, 400, "Credenciales incompletas");
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (!user || !compareSync(password, user.password_hash)) {
      return apiError(res, 401, "Acceso denegado");
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role });

    res.setHeader("Set-Cookie", `authToken=${token}; HttpOnly; Path=/; Max-Age=3600; Secure=${process.env.NODE_ENV === "production"}; SameSite=Strict`);
    
    return apiSuccess(res, { message: "Sesión iniciada correctamente" });
  } catch (error) {
    console.error("Login Error:", error);
    return apiError(res, 500, "Error interno del servidor");
  }
}
