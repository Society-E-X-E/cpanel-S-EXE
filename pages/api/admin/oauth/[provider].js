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

function redirect(res, path, status = "", provider = "") {
  const url = new URL(path, process.env.APP_BASE_URL || "http://localhost:3000");
  if (status) url.searchParams.set("oauth", status);
  if (provider) url.searchParams.set("provider", provider);
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
    db.prepare("DELETE FROM oauth_transactions WHERE user_id = ? AND provider = ?").run(userId, providerId);
    db.prepare("DELETE FROM oauth_transactions WHERE created_at < ?").run(new Date(Date.now() - TRANSACTION_TTL_MS).toISOString());
    db.prepare(`
      INSERT INTO oauth_transactions (state_hash, user_id, provider, code_verifier_encrypted, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(stateHash, userId, providerId, encryptOAuthSecret(pkce.verifier), createdAt);

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
    db.prepare("DELETE FROM oauth_login_transactions WHERE provider = ?").run(providerId);
    db.prepare("DELETE FROM oauth_login_transactions WHERE created_at < ?").run(new Date(Date.now() - TRANSACTION_TTL_MS).toISOString());
    db.prepare(`
      INSERT INTO oauth_login_transactions (state_hash, provider, code_verifier_encrypted, created_at)
      VALUES (?, ?, ?, ?)
    `).run(stateHash, providerId, encryptOAuthSecret(pkce.verifier), createdAt);

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
  const loginTransaction = db.prepare("SELECT * FROM oauth_login_transactions WHERE state_hash = ? AND provider = ?")
    .get(stateHash, providerId);
  const linkTransaction = db.prepare("SELECT * FROM oauth_transactions WHERE state_hash = ? AND provider = ?")
    .get(stateHash, providerId);
  const clearedCookies = clearStateCookies(res, providerId);
  db.prepare("DELETE FROM oauth_login_transactions WHERE state_hash = ?").run(stateHash);
  db.prepare("DELETE FROM oauth_transactions WHERE state_hash = ?").run(stateHash);

  const isLogin = Boolean(loginTransaction);
  const transaction = loginTransaction || linkTransaction;
  const expectedCookie = req.cookies?.[stateCookie(providerId, isLogin ? "login" : "link")];
  const failure = (status = "error") => redirect(res, isLogin ? "/" : "/profile", status, providerId);
  if (!transaction || Boolean(loginTransaction && linkTransaction) || !safeEqual(state, expectedCookie)) {
    return failure();
  }

  if (Date.now() - new Date(transaction.created_at).getTime() > TRANSACTION_TTL_MS || !code || req.query.error) {
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
      const linkedUser = db.prepare(`
        SELECT u.id
        FROM oauth_links AS link
        JOIN staff_users AS u ON u.id = link.user_id
        WHERE link.provider = ? AND link.provider_user_id = ?
      `).get(providerId, result.profile.subject);
      if (!linkedUser) return failure("unlinked");

      db.prepare(`
        UPDATE oauth_links
        SET display_name = ?, username = ?, profile_url = ?, avatar_url = ?,
            access_token_encrypted = ?, token_expires_at = ?, scopes = ?, updated_at = ?
        WHERE user_id = ? AND provider = ?
      `).run(
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
      );
      issueSession(res, linkedUser.id, clearedCookies);
      return redirect(res, "/dashboard");
    }

    const user = db.prepare("SELECT id FROM staff_users WHERE id = ?").get(transaction.user_id);
    if (!user) return failure();
    const linkedElsewhere = db.prepare(`
      SELECT user_id FROM oauth_links WHERE provider = ? AND provider_user_id = ? AND user_id != ?
    `).get(providerId, result.profile.subject, user.id);
    if (linkedElsewhere) return failure("conflict");

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO oauth_links (
        user_id, provider, provider_user_id, display_name, username, profile_url, avatar_url,
        access_token_encrypted, token_expires_at, scopes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    `).run(
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
    );
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

  if (req.method === "GET" && req.query.action === "login-status") {
    return res.status(200).json({ status: "ok", providers: getProviderStatus() });
  }

  if (req.method === "GET" && (req.query.code || req.query.error || req.query.state)) {
    return completeAuthorization(req, res, providerId);
  }

  if (req.method === "GET" && req.query.action === "login") {
    return startLoginAuthorization(res, providerId);
  }

  if (req.method === "GET" && req.query.action === "status") {
    const user = getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    const connections = db.prepare(`
      SELECT provider, display_name, username, profile_url, avatar_url, created_at
      FROM oauth_links WHERE user_id = ?
    `).all(user.id);
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
    const user = getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    return startAuthorization(res, user.id, providerId);
  }

  if (req.method === "DELETE") {
    const user = getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    db.prepare("DELETE FROM oauth_links WHERE user_id = ? AND provider = ?").run(user.id, providerId);
    return res.status(200).json({
      status: "ok",
      message: "Se quitó la conexión y el token local. Si quieres revocar el permiso del proveedor, hazlo también en su configuración de aplicaciones autorizadas.",
    });
  }

  res.setHeader("Allow", ["GET", "DELETE"]);
  return res.status(405).json({ status: "error", message: "Método no permitido." });
}
