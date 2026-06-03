import { verifyToken } from "./auth";

export function apiError(res, statusCode, message) {
  return res.status(statusCode).json({ status: "error", message });
}

export function apiSuccess(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({ status: "ok", ...data });
}

export function methodNotAllowed(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.setHeader("Allow", allowed);
    return apiError(res, 405, `Método ${req.method} no permitido`);
  }
  return null;
}

export function requireAuth(req, res) {
  const { authToken } = req.cookies;
  if (!authToken) {
    apiError(res, 401, "No autorizado");
    return null;
  }

  const decoded = verifyToken(authToken);
  if (!decoded) {
    apiError(res, 401, "Token inválido");
    return null;
  }

  return decoded;
}

export function requireAdmin(req, res) {
  const decoded = requireAuth(req, res);
  if (!decoded) return null;

  if (decoded.role !== "admin") {
    apiError(res, 401, "Sin permisos");
    return null;
  }

  return decoded;
}
