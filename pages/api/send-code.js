import db from "../../lib/db";
import { requireAdmin, methodNotAllowed, apiError, apiSuccess } from "../../lib/apiHelpers";

export default async function handler(req, res) {
  const rejected = methodNotAllowed(req, res, ["POST"]);
  if (rejected) return rejected;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { user, phone = "", flow = "default", action = "otp-e" } = req.body;
  if (!user) {
    return apiError(res, 400, "Falta el usuario");
  }

  const createdAt = new Date().toISOString();
  if (action === "otp-p") {
    db.prepare("INSERT INTO user_codes (username, code, flow, action, phone, created_at, processed) VALUES (?, ?, ?, ?, ?, ?, 0)").run(user, "", flow, action, phone, createdAt);
    console.log(`[send-code] user=${user} action=otp-p flow=${flow} phone=${phone || "(none)"}`);
    return apiSuccess(res, { message: "Solicitud de teléfono registrada" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.prepare("INSERT INTO user_codes (username, code, flow, action, phone, created_at, processed) VALUES (?, ?, ?, ?, ?, ?, 0)").run(user, code, flow, action, phone, createdAt);
  console.log(`[send-code] user=${user} action=otp-e flow=${flow} phone=${phone || "(none)"} code=${code}`);
  return apiSuccess(res, { message: "Código enviado", code: process.env.NEXT_PUBLIC_DEV_SHOW_CODE === "true" ? code : undefined });
}
