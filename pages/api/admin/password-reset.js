import { hash } from "bcryptjs";
import db from "../../../lib/db";
import { validateEmailConfiguration } from "../../../lib/mailer";
import {
  claimOtpRequestLimit,
  consumeOtp,
  createAndSendOtp,
  isValidOtp,
  validateOtpConfiguration,
} from "../../../lib/emailOtp";

const MIN_PASSWORD_LENGTH = 12;
const GENERIC_REQUEST_MESSAGE =
  "Si existe una cuenta con ese correo verificado, recibirás un código en unos minutos.";

function validEmail(email) {
  return typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function requestReset(req, res) {
  const { email } = req.body || {};
  if (!validEmail(email)) {
    return res.status(400).json({ status: "error", message: "Ingresa un correo válido." });
  }
  if (!await claimOtpRequestLimit(req)) {
    return res.status(202).json({ status: "ok", message: GENERIC_REQUEST_MESSAGE });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await db.query(`
    SELECT id, email
    FROM staff_users
    WHERE lower(email) = $1 AND email_verified_at IS NOT NULL
    LIMIT 1
  `, [normalizedEmail]);
  const account = rows[0];
  if (account) {
    try {
      await createAndSendOtp({
        userId: account.id,
        email: account.email,
        purpose: "password_reset",
        req,
        ipLimitClaimed: true,
      });
    } catch (error) {
      console.error("Password-reset OTP delivery failed:", error instanceof Error ? error.name : "UnknownError");
    }
  }
  return res.status(202).json({ status: "ok", message: GENERIC_REQUEST_MESSAGE });
}

async function confirmReset(req, res) {
  const { email, code, newPassword } = req.body || {};
  if (
    !validEmail(email) ||
    !isValidOtp(code) ||
    typeof newPassword !== "string" ||
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > 128
  ) {
    return res.status(400).json({
      status: "error",
      message: "El código o la nueva contraseña no son válidos. La contraseña debe tener entre 12 y 128 caracteres.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await db.query(`
    SELECT id, email
    FROM staff_users
    WHERE lower(email) = $1 AND email_verified_at IS NOT NULL
    LIMIT 1
  `, [normalizedEmail]);
  const account = rows[0];
  if (!account || !await consumeOtp({
    userId: account.id,
    email: account.email,
    purpose: "password_reset",
    code,
  })) {
    return res.status(400).json({
      status: "error",
      message: "El código no es válido o venció. Solicita uno nuevo e inténtalo otra vez.",
    });
  }

  const updated = await db.query(`
    UPDATE staff_users
    SET password_hash = $1,
        must_change_password = FALSE,
        token_version = token_version + 1
    WHERE id = $2 AND lower(email) = $3 AND email_verified_at IS NOT NULL
    RETURNING id
  `, [await hash(newPassword, 12), account.id, normalizedEmail]);
  if (!updated.rows.length) {
    return res.status(400).json({
      status: "error",
      message: "El código no es válido o venció. Solicita uno nuevo e inténtalo otra vez.",
    });
  }

  return res.status(200).json({
    status: "ok",
    message: "Contraseña restablecida. Inicia sesión con tu nueva contraseña.",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ status: "error", message: "Método no permitido." });
  }

  res.setHeader("Cache-Control", "no-store");
  await db.migrate();
  try {
    await validateOtpConfiguration();
    if (req.body?.action === "request") validateEmailConfiguration();
  } catch (error) {
    console.error("Password-reset email configuration is invalid:", error instanceof Error ? error.name : "UnknownError");
    return res.status(503).json({ status: "error", message: "La recuperación no está disponible temporalmente." });
  }
  if (req.body?.action === "request") return requestReset(req, res);
  if (req.body?.action === "confirm") return confirmReset(req, res);
  return res.status(400).json({ status: "error", message: "Solicitud no válida." });
}
