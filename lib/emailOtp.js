import crypto from "crypto";
import db from "./db";
import { sendSecurityCode } from "./mailer";
import { getOtpSecretValue } from "./secretManager";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export async function validateOtpConfiguration() {
  await getOtpSecretValue();
}

async function hashValue(value) {
  return crypto.createHmac("sha256", await getOtpSecretValue()).update(value).digest("hex");
}

async function hashCode(userId, purpose, email, code) {
  return hashValue(`${userId}:${purpose}:${email.toLowerCase()}:${code}`);
}

function requestIp(req) {
  const realIp = req.headers?.["x-real-ip"];
  return typeof realIp === "string" && realIp.length <= 64
    ? realIp
    : req.socket?.remoteAddress || "unknown";
}

async function claimRateLimit(scope, maximum, windowSeconds) {
  const key = await hashValue(scope);
  const { rows } = await db.query(`
    INSERT INTO email_otp_rate_limits (scope_key, window_started_at, request_count)
    VALUES ($1, now(), 1)
    ON CONFLICT (scope_key) DO UPDATE SET
      request_count = CASE
        WHEN email_otp_rate_limits.window_started_at <= now() - make_interval(secs => $3)
          THEN 1
        ELSE email_otp_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN email_otp_rate_limits.window_started_at <= now() - make_interval(secs => $3)
          THEN now()
        ELSE email_otp_rate_limits.window_started_at
      END
    RETURNING request_count <= $2 AS allowed
  `, [key, maximum, windowSeconds]);
  await db.query("DELETE FROM email_otp_rate_limits WHERE window_started_at < now() - interval '1 day'");
  return rows[0]?.allowed === true;
}

export async function claimOtpRequestLimit(req) {
  return claimRateLimit(`ip:${requestIp(req)}`, 12, 60 * 60);
}

export async function createAndSendOtp({ userId, email, purpose, req, ipLimitClaimed = false }) {
  if (!ipLimitClaimed && !await claimOtpRequestLimit(req)) {
    return { rateLimited: true };
  }
  if (!await claimRateLimit(`user:${userId}:${purpose}`, 3, 15 * 60)) {
    return { rateLimited: true };
  }

  await db.query(`
    UPDATE email_otp_challenges
    SET consumed_at = now()
    WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
  `, [userId, purpose]);
  await db.query(`
    DELETE FROM email_otp_challenges
    WHERE expires_at < now() - interval '1 day'
  `);

  const code = String(crypto.randomInt(0, 100_000_000)).padStart(8, "0");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + OTP_TTL_MINUTES * 60 * 1000);
  const [codeHash, requestIpHash] = await Promise.all([
    hashCode(userId, purpose, email, code),
    hashValue(`ip:${requestIp(req)}`),
  ]);
  const { rows } = await db.query(`
    INSERT INTO email_otp_challenges (
      user_id, purpose, email_snapshot, code_hash, request_ip_hash, created_at, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    userId,
    purpose,
    email,
    codeHash,
    requestIpHash,
    createdAt.toISOString(),
    expiresAt.toISOString(),
  ]);

  try {
    await sendSecurityCode({ email, code, purpose });
  } catch (error) {
    await db.query(
      "UPDATE email_otp_challenges SET consumed_at = now() WHERE id = $1",
      [rows[0].id],
    );
    throw error;
  }

  return { rateLimited: false };
}

export async function consumeOtp({ userId, email, purpose, code }) {
  const { rows } = await db.query(`
    SELECT id, code_hash
    FROM email_otp_challenges
    WHERE user_id = $1 AND purpose = $2 AND email_snapshot = $3
      AND consumed_at IS NULL AND expires_at > now() AND attempt_count < $4
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId, purpose, email, OTP_MAX_ATTEMPTS]);
  const challenge = rows[0];
  if (!challenge) return false;

  const submittedHash = await hashCode(userId, purpose, email, code);
  const expected = Buffer.from(challenge.code_hash, "hex");
  const submitted = Buffer.from(submittedHash, "hex");
  const matches = expected.length === submitted.length && crypto.timingSafeEqual(expected, submitted);
  const updated = await db.query(`
    UPDATE email_otp_challenges
    SET attempt_count = attempt_count + 1,
        consumed_at = CASE WHEN $2 THEN now() ELSE consumed_at END
    WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() AND attempt_count < $3
    RETURNING ($2 AND consumed_at IS NOT NULL) AS consumed
  `, [challenge.id, matches, OTP_MAX_ATTEMPTS]);
  return updated.rows[0]?.consumed === true;
}

export function isValidOtp(value) {
  return typeof value === "string" && /^\d{8}$/.test(value);
}
