import db from "../../../lib/db";
import { getSafeAwsErrorDetails } from "../../../lib/awsErrorDetails";
import { validateEmailConfiguration } from "../../../lib/mailer";
import { getCurrentUser, respondUnauthorized } from "../../../lib/session";
import {
  consumeOtp,
  createAndSendOtp,
  isValidOtp,
  validateOtpConfiguration,
} from "../../../lib/emailOtp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ status: "error", message: "Método no permitido." });
  }

  res.setHeader("Cache-Control", "no-store");
  const user = await getCurrentUser(req);
  if (!user) return respondUnauthorized(res);
  try {
    await validateOtpConfiguration();
    if (req.body?.action === "request") validateEmailConfiguration();
  } catch (error) {
    console.error("Email-verification email configuration is invalid:", error instanceof Error ? error.name : "UnknownError");
    return res.status(503).json({ status: "error", message: "La verificación de correo no está disponible temporalmente." });
  }

  const { rows } = await db.query(
    "SELECT email, email_verified_at FROM staff_users WHERE id = $1",
    [user.id],
  );
  const account = rows[0];
  if (!account?.email) {
    return res.status(400).json({ status: "error", message: "Añade un correo a tu perfil antes de verificarlo." });
  }

  if (req.body?.action === "request") {
    if (account.email_verified_at) {
      return res.status(200).json({ status: "ok", message: "Tu correo ya está verificado." });
    }
    try {
      const result = await createAndSendOtp({
        userId: user.id,
        email: account.email,
        purpose: "email_verification",
        req,
      });
      if (result.rateLimited) {
        return res.status(429).json({ status: "error", message: "Se alcanzó el límite de códigos. Espera antes de volver a intentarlo." });
      }
    } catch (error) {
      console.error("Email-verification OTP delivery failed:", getSafeAwsErrorDetails(error));
      return res.status(503).json({ status: "error", message: "No se pudo enviar el código. Inténtalo más tarde." });
    }
    return res.status(200).json({ status: "ok", message: "Enviamos un código de verificación a tu correo." });
  }

  const { code } = req.body || {};
  if (req.body?.action !== "verify" || !isValidOtp(code)) {
    return res.status(400).json({ status: "error", message: "Ingresa el código de ocho dígitos enviado a tu correo." });
  }
  const verified = await consumeOtp({
    userId: user.id,
    email: account.email,
    purpose: "email_verification",
    code,
  });
  if (!verified) {
    return res.status(400).json({ status: "error", message: "El código no es válido o venció. Solicita uno nuevo." });
  }

  try {
    const updated = await db.query(
      "UPDATE staff_users SET email_verified_at = $1 WHERE id = $2 AND email = $3 RETURNING id",
      [new Date().toISOString(), user.id, account.email],
    );
    if (!updated.rows.length) {
      return res.status(409).json({ status: "error", message: "El correo cambió durante la verificación. Solicita un código nuevo." });
    }
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ status: "error", message: "Ese correo ya está verificado en otra cuenta del equipo." });
    }
    throw error;
  }
  return res.status(200).json({ status: "ok", message: "Correo verificado correctamente." });
}
