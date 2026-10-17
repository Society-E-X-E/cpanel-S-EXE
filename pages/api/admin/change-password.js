import { compare, hash } from "bcryptjs";
import db from "../../../lib/db";
import { getCurrentUser, respondUnauthorized } from "../../../lib/session";

const MIN_PASSWORD_LENGTH = 12;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ status: "error", message: "Método no permitido." });
  }

  res.setHeader("Cache-Control", "no-store");
  const user = await getCurrentUser(req, { allowPasswordChange: true });
  if (!user) return respondUnauthorized(res);

  const { currentPassword, newPassword } = req.body || {};
  if (
    typeof currentPassword !== "string" ||
    !currentPassword ||
    currentPassword.length > 128 ||
    typeof newPassword !== "string" ||
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > 128
  ) {
    return res.status(400).json({
      status: "error",
      message: "La contraseña nueva debe tener entre 12 y 128 caracteres.",
    });
  }

  const { rows } = await db.query(
    "SELECT password_hash FROM staff_users WHERE id = $1",
    [user.id],
  );
  const storedHash = rows[0]?.password_hash;
  if (!storedHash || !await compare(currentPassword, storedHash)) {
    return res.status(401).json({ status: "error", message: "La contraseña actual no es correcta." });
  }
  if (await compare(newPassword, storedHash)) {
    return res.status(400).json({ status: "error", message: "Elige una contraseña distinta a la actual." });
  }

  await db.query(`
    UPDATE staff_users
    SET password_hash = $1, must_change_password = FALSE, token_version = token_version + 1
    WHERE id = $2
  `, [await hash(newPassword, 12), user.id]);
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader("Set-Cookie", `authToken=; HttpOnly; Path=/; Max-Age=0;${secure} SameSite=Strict`);
  return res.status(200).json({ status: "ok", message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." });
}
