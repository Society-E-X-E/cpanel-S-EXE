import { methodNotAllowed, apiSuccess } from "../../../lib/apiHelpers";

export default function handler(req, res) {
  const rejected = methodNotAllowed(req, res, ["POST"]);
  if (rejected) return rejected;

  res.setHeader('Set-Cookie', 'authToken=; HttpOnly; Path=/; Max-Age=0; Secure=' + (process.env.NODE_ENV === 'production' ? 'true' : 'false') + '; SameSite=Strict');
  return apiSuccess(res, { message: 'Sesión cerrada' });
}
