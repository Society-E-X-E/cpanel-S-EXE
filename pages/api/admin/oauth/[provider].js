import crypto from "crypto";
import db from "../../../../lib/db";
import { signToken } from "../../../../lib/auth";
import { getCurrentUser, respondUnauthorized } from "../../../../lib/session";
import {
  decryptOAuthSecret,
  encryptOAuthSecret,
  exchangeOAuthCode,
  getProvider,
  getProviderCredentials,
  getProviderStatus,
  getRedirectUri,
  createPkcePair,
} from "../../../../lib/oauth";

const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const PROVIDER_ERROR_CODES = new Set([
  "access_denied",
  "invalid_client",
  "invalid_request",
  "invalid_scope",
  "org_internal",
  "server_error",
  "temporarily_unavailable",
  "unauthorized_client",
  "unsupported_response_type",
]);

function cookieOptions() {
  return `Path=/; Max-Age=600; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function stateCookie(provider, purpose = "link") {
  return purpose === "login"
    ? `society_oauth_login_${provider}`
    : `society_oauth_${provider}`;
}

function providerFromRequest(req) {
  const provider = Array.isArray(req.query.provider) ? req.query.provider[0] : req.query.provider;
  return typeof provider === "string" ? provider : "";
}

function redirect(res, path, status = "", provider = "", reason = "") {
  const url = new URL(path, process.env.APP_BASE_URL || "http://localhost:3000");
  if (status) url.searchParams.set("oauth", status);
  if (provider) url.searchParams.set("provider", provider);
  if (reason) url.searchParams.set("reason", reason);
  res.writeHead(302, { Location: `${url.pathname}${url.search}` });
  return res.end();
}

function clearStateCookies(res, provider) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookies = [
    `society_oauth_${provider}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
    `society_oauth_login_${provider}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
  ];
  res.setHeader("Set-Cookie", cookies);
  return cookies;
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function authorizationUrl(provider, providerId, redirectUri, state, pkce) {
  const url = new URL(provider.authorizationEndpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    scope: provider.scopes.join(" "),
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url;
}

async function startAuthorization(res, userId, providerId) {
  const provider = getProviderCredentials(providerId);
  if (!provider) {
    return res.status(503).json({ status: "error", message: "Esta conexión social aún no está configurada." });
  }

  try {
    const redirectUri = getRedirectUri(providerId);
    const pkce = createPkcePair();
    const state = crypto.randomBytes(32).toString("base64url");
    const stateHash = crypto.createHash("sha256").update(state).digest("hex");
    const createdAt = new Date().toISOString();
    await db.query("DELETE FROM oauth_transactions WHERE user_id = $1 AND provider = $2", [userId, providerId]);
    await db.query("DELETE FROM oauth_transactions WHERE created_at < $1", [new Date(Date.now() - TRANSACTION_TTL_MS).toISOString()]);
    await db.query(`
      INSERT INTO oauth_transactions (state_hash, user_id, provider, code_verifier_encrypted, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [stateHash, userId, providerId, encryptOAuthSecret(pkce.verifier), createdAt]);

    res.setHeader("Set-Cookie", `${stateCookie(providerId)}=${state}; ${cookieOptions()}`);
    return res.writeHead(302, {
      Location: authorizationUrl(provider, providerId, redirectUri, state, pkce).toString(),
    }).end();
  } catch (error) {
    console.error(`OAuth initialization failed for ${providerId}:`, error);
    return res.status(500).json({ status: "error", message: "No se pudo iniciar la conexión. Revisa la configuración del servidor." });
  }
}

async function startLoginAuthorization(res, providerId) {
  const provider = getProviderCredentials(providerId);
  if (!provider) {
    return redirect(res, "/", "unavailable", providerId);
  }

  try {
    const redirectUri = getRedirectUri(providerId);
    const pkce = createPkcePair();
    const state = crypto.randomBytes(32).toString("base64url");
    const stateHash = crypto.createHash("sha256").update(state).digest("hex");
    const createdAt = new Date().toISOString();
    await db.query("DELETE FROM oauth_login_transactions WHERE provider = $1", [providerId]);
    await db.query("DELETE FROM oauth_login_transactions WHERE created_at < $1", [new Date(Date.now() - TRANSACTION_TTL_MS).toISOString()]);
    await db.query(`
      INSERT INTO oauth_login_transactions (state_hash, provider, code_verifier_encrypted, created_at)
      VALUES ($1, $2, $3, $4)
    `, [stateHash, providerId, encryptOAuthSecret(pkce.verifier), createdAt]);

    res.setHeader("Set-Cookie", `${stateCookie(providerId, "login")}=${state}; ${cookieOptions()}`);
    return res.writeHead(302, {
      Location: authorizationUrl(provider, providerId, redirectUri, state, pkce).toString(),
    }).end();
  } catch (error) {
    console.error(`OAuth login initialization failed for ${providerId}:`, error);
    return redirect(res, "/", "error", providerId);
  }
}

function issueSession(res, userId, priorCookies = []) {
  const token = signToken({ userId });
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader("Set-Cookie", [
    ...priorCookies,
    `authToken=${token}; HttpOnly; Path=/; Max-Age=3600;${secure} SameSite=Lax`,
  ]);
}

async function completeAuthorization(req, res, providerId) {
  if (!getProvider(providerId)) return res.status(404).end();

  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  const loginResult = await db.query(
    "SELECT * FROM oauth_login_transactions WHERE state_hash = $1 AND provider = $2",
    [stateHash, providerId],
  );
  const linkResult = await db.query(
    "SELECT * FROM oauth_transactions WHERE state_hash = $1 AND provider = $2",
    [stateHash, providerId],
  );
  const loginTransaction = loginResult.rows[0];
  const linkTransaction = linkResult.rows[0];
  const clearedCookies = clearStateCookies(res, providerId);
  await db.query("DELETE FROM oauth_login_transactions WHERE state_hash = $1", [stateHash]);
  await db.query("DELETE FROM oauth_transactions WHERE state_hash = $1", [stateHash]);

  const isLogin = Boolean(loginTransaction);
  const transaction = loginTransaction || linkTransaction;
  const expectedCookie = req.cookies?.[stateCookie(providerId, isLogin ? "login" : "link")];
  const failure = (status = "error", reason = "") => redirect(res, isLogin ? "/" : "/profile", status, providerId, reason);
  if (!transaction || Boolean(loginTransaction && linkTransaction) || !safeEqual(state, expectedCookie)) {
    return failure();
  }

  if (req.query.error) {
    const providerError = typeof req.query.error === "string" && PROVIDER_ERROR_CODES.has(req.query.error)
      ? req.query.error
      : req.query.error === "org_internal" ? "org_internal" : "other";
    console.warn(`OAuth authorization rejected by ${providerId}: ${providerError}`);
    return failure("provider-error", providerError);
  }

  if (Date.now() - new Date(transaction.created_at).getTime() > TRANSACTION_TTL_MS || !code) {
    return failure();
  }

  try {
    const result = await exchangeOAuthCode(
      providerId,
      code,
      decryptOAuthSecret(transaction.code_verifier_encrypted),
      getRedirectUri(providerId),
    );

    if (isLogin) {
      const linkedResult = await db.query(`
        SELECT u.id
        FROM oauth_links AS link
        JOIN staff_users AS u ON u.id = link.user_id
        WHERE link.provider = $1 AND link.provider_user_id = $2
      `, [providerId, result.profile.subject]);
      const linkedUser = linkedResult.rows[0];
      if (!linkedUser) return failure("unlinked");

      await db.query(`
        UPDATE oauth_links
        SET display_name = $1, username = $2, profile_url = $3, avatar_url = $4,
            access_token_encrypted = $5, token_expires_at = $6, scopes = $7, updated_at = $8
        WHERE user_id = $9 AND provider = $10
      `, [
        result.profile.displayName,
        result.profile.username,
        result.profile.profileUrl,
        result.profile.avatarUrl,
        encryptOAuthSecret(result.accessToken),
        result.expiresAt,
        result.scopes,
        new Date().toISOString(),
        linkedUser.id,
        providerId,
      ]);
      issueSession(res, linkedUser.id, clearedCookies);
      return redirect(res, "/dashboard");
    }

    const userResult = await db.query("SELECT id FROM staff_users WHERE id = $1", [transaction.user_id]);
    const user = userResult.rows[0];
    if (!user) return failure();
    const linkedElsewhereResult = await db.query(`
      SELECT user_id FROM oauth_links WHERE provider = $1 AND provider_user_id = $2 AND user_id <> $3
    `, [providerId, result.profile.subject, user.id]);
    const linkedElsewhere = linkedElsewhereResult.rows[0];
    if (linkedElsewhere) return failure("conflict");

    const now = new Date().toISOString();
    await db.query(`
      INSERT INTO oauth_links (
        user_id, provider, provider_user_id, display_name, username, profile_url, avatar_url,
        access_token_encrypted, token_expires_at, scopes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        provider_user_id = excluded.provider_user_id,
        display_name = excluded.display_name,
        username = excluded.username,
        profile_url = excluded.profile_url,
        avatar_url = excluded.avatar_url,
        access_token_encrypted = excluded.access_token_encrypted,
        token_expires_at = excluded.token_expires_at,
        scopes = excluded.scopes,
        updated_at = excluded.updated_at
    `, [
      user.id,
      providerId,
      result.profile.subject,
      result.profile.displayName,
      result.profile.username,
      result.profile.profileUrl,
      result.profile.avatarUrl,
      encryptOAuthSecret(result.accessToken),
      result.expiresAt,
      result.scopes,
      now,
      now,
    ]);
    return redirect(res, "/profile", "connected", providerId);
  } catch (error) {
    console.error(`OAuth callback failed for ${providerId}:`, error);
    return failure();
  }
}

export default async function handler(req, res) {
  const providerId = providerFromRequest(req);
  if (!getProvider(providerId)) {
    return res.status(404).json({ status: "error", message: "Proveedor OAuth no válido." });
  }

  if (req.method !== "GET" && req.method !== "DELETE") {
    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).json({ status: "error", message: "Método no permitido." });
  }

  if (req.method === "GET" && req.query.action === "login-status") {
    return res.status(200).json({ status: "ok", providers: getProviderStatus() });
  }

  await db.migrate();

  if (req.method === "GET" && (req.query.code || req.query.error || req.query.state)) {
    return completeAuthorization(req, res, providerId);
  }

  if (req.method === "GET" && req.query.action === "login") {
    return startLoginAuthorization(res, providerId);
  }

  if (req.method === "GET" && req.query.action === "status") {
    const user = await getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    const { rows: connections } = await db.query(`
      SELECT provider, display_name, username, profile_url, avatar_url, created_at
      FROM oauth_links WHERE user_id = $1
    `, [user.id]);
    return res.status(200).json({
      status: "ok",
      providers: getProviderStatus(),
      connections: Object.fromEntries(connections.map((connection) => [connection.provider, {
        displayName: connection.display_name,
        username: connection.username,
        profileUrl: connection.profile_url,
        avatarUrl: connection.avatar_url,
        connectedAt: connection.created_at,
      }])),
    });
  }

  if (req.method === "GET") {
    const user = await getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    return startAuthorization(res, user.id, providerId);
  }

  if (req.method === "DELETE") {
    const user = await getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    await db.query("DELETE FROM oauth_links WHERE user_id = $1 AND provider = $2", [user.id, providerId]);
    return res.status(200).json({
      status: "ok",
      message: "Se quitó la conexión y el token local. Si quieres revocar el permiso del proveedor, hazlo también en su configuración de aplicaciones autorizadas.",
    });
  }

  res.setHeader("Allow", ["GET", "DELETE"]);
  return res.status(405).json({ status: "error", message: "Método no permitido." });
}
