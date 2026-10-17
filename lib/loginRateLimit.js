import crypto from "crypto";
import db from "./db";

const WINDOW_SECONDS = 15 * 60;
const USER_IP_FAILURE_LIMIT = 8;
const IP_FAILURE_LIMIT = 30;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function fingerprint(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function rateLimitKeys(req, username) {
  const headerIp = req.headers?.["x-real-ip"];
  const ip = typeof headerIp === "string" && headerIp.length <= 64
    ? headerIp
    : req.socket?.remoteAddress || "unknown";
  const normalizedUsername = username.trim().toLowerCase();
  return {
    ipKey: fingerprint(`login:ip:${ip}`),
    userIpKey: fingerprint(`login:user-ip:${ip}:${normalizedUsername}`),
  };
}

export async function isLoginRateLimited(req, username) {
  const { ipKey, userIpKey } = rateLimitKeys(req, username);
  const { rows } = await db.query(`
    SELECT scope_key, request_count
    FROM email_otp_rate_limits
    WHERE scope_key = ANY($1::text[])
      AND window_started_at > now() - make_interval(secs => $2)
  `, [[ipKey, userIpKey], WINDOW_SECONDS]);
  return rows.some(({ scope_key, request_count }) =>
    (scope_key === ipKey && request_count >= IP_FAILURE_LIMIT) ||
    (scope_key === userIpKey && request_count >= USER_IP_FAILURE_LIMIT)
  );
}

export async function recordFailedLogin(req, username) {
  const { ipKey, userIpKey } = rateLimitKeys(req, username);
  await db.query(`
    INSERT INTO email_otp_rate_limits (scope_key, window_started_at, request_count)
    SELECT scope_key, now(), 1
    FROM unnest($1::text[]) AS keys(scope_key)
    ON CONFLICT (scope_key) DO UPDATE SET
      request_count = CASE
        WHEN email_otp_rate_limits.window_started_at <= now() - make_interval(secs => $2)
          THEN 1
        ELSE email_otp_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN email_otp_rate_limits.window_started_at <= now() - make_interval(secs => $2)
          THEN now()
        ELSE email_otp_rate_limits.window_started_at
      END
  `, [[ipKey, userIpKey], WINDOW_SECONDS]);
  await db.query("DELETE FROM email_otp_rate_limits WHERE window_started_at < now() - interval '1 day'");
}

export async function clearUsernameLoginFailures(req, username) {
  const { userIpKey } = rateLimitKeys(req, username);
  await db.query("DELETE FROM email_otp_rate_limits WHERE scope_key = $1", [userIpKey]);
}
