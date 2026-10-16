import crypto from "crypto";
import db from "../../../../lib/db";
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

function providerFromRequest(req) {
  const provider = Array.isArray(req.query.provider) ? req.query.provider[0] : req.query.provider;
  return typeof provider === "string" ? provider : "";
}

function redirectToProfile(res, status, provider = "") {
  const url = new URL("/profile", process.env.APP_BASE_URL || "http://localhost:3000");
  url.searchParams.set("oauth", status);
  if (provider) url.searchParams.set("provider", provider);
  res.writeHead(302, { Location: `${url.pathname}${url.search}` });
  return res.end();
}

function clearStateCookie(res, provider) {
  res.setHeader("Set-Cookie", `society_oauth_${provider}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function startAuthorization(req, res, userId, providerId) {
  const provider = getProviderCredentials(providerId);
  if (!provider) {
    return res.status(503).json({ status: "error", message: "Esta conexión social aún no está configurada." });
  }

  let redirectUri;
  let encryptedVerifier;
  try {
    redirectUri = getRedirectUri(providerId);
    const pkce = createPkcePair();
    encryptedVerifier = encryptOAuthSecret(pkce.verifier);
    const state = crypto.randomBytes(32).toString("base64url");
    const createdAt = new Date().toISOString();
    db.prepare("DELETE FROM oauth_transactions WHERE user_id = ? AND provider = ?").run(userId, providerId);
    db.prepare("DELETE FROM oauth_transactions WHERE created_at < ?").run(new Date(Date.now() - TRANSACTION_TTL_MS).toISOString());
    db.prepare(`
      INSERT INTO oauth_transactions (state_hash, user_id, provider, code_verifier_encrypted, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.createHash("sha256").update(state).digest("hex"), userId, providerId, encryptedVerifier, createdAt);

    const authorizationUrl = new URL(provider.authorizationEndpoint);
    authorizationUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      scope: provider.scopes.join(" "),
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
    }).toString();
    res.setHeader("Set-Cookie", `society_oauth_${providerId}=${state}; ${cookieOptions()}`);
    return res.writeHead(302, { Location: authorizationUrl.toString() }).end();
  } catch (error) {
    console.error(`OAuth initialization failed for ${providerId}:`, error);
    return res.status(500).json({ status: "error", message: "No se pudo iniciar la conexión. Revisa la configuración del servidor." });
  }
}

async function completeAuthorization(req, res, providerId) {
  const provider = getProvider(providerId);
  if (!provider) return res.status(404).end();
  clearStateCookie(res, providerId);

  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = req.cookies?.[`society_oauth_${providerId}`];
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!safeEqual(state, cookieState)) {
    return redirectToProfile(res, "error", providerId);
  }

  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  const transaction = db.prepare("SELECT * FROM oauth_transactions WHERE state_hash = ? AND provider = ?")
    .get(stateHash, providerId);
  db.prepare("DELETE FROM oauth_transactions WHERE state_hash = ?").run(stateHash);
  if (!transaction || Date.now() - new Date(transaction.created_at).getTime() > TRANSACTION_TTL_MS) {
    return redirectToProfile(res, "error", providerId);
  }

  if (!code || req.query.error) {
    return redirectToProfile(res, "error", providerId);
  }

  const user = db.prepare("SELECT id FROM staff_users WHERE id = ?").get(transaction.user_id);
  if (!user) return redirectToProfile(res, "error", providerId);

  try {
    const result = await exchangeOAuthCode(
      providerId,
      code,
      decryptOAuthSecret(transaction.code_verifier_encrypted),
      getRedirectUri(providerId),
    );
    const linkedElsewhere = db.prepare(`
      SELECT user_id FROM oauth_links WHERE provider = ? AND provider_user_id = ? AND user_id != ?
    `).get(providerId, result.profile.subject, user.id);
    if (linkedElsewhere) return redirectToProfile(res, "conflict", providerId);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO oauth_links (
        user_id, provider, provider_user_id, display_name, username, profile_url,
        access_token_encrypted, token_expires_at, scopes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        provider_user_id = excluded.provider_user_id,
        display_name = excluded.display_name,
        username = excluded.username,
        profile_url = excluded.profile_url,
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
      encryptOAuthSecret(result.accessToken),
      result.expiresAt,
      result.scopes,
      now,
      now,
    );
    return redirectToProfile(res, "connected", providerId);
  } catch (error) {
    console.error(`OAuth callback failed for ${providerId}:`, error);
    return redirectToProfile(res, "error", providerId);
  }
}

export default async function handler(req, res) {
  const providerId = providerFromRequest(req);
  if (!getProvider(providerId)) {
    return res.status(404).json({ status: "error", message: "Proveedor OAuth no válido." });
  }

  if (req.method === "GET" && req.query.action === "status") {
    const user = getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    const connections = db.prepare(`
      SELECT provider, display_name, username, profile_url, created_at
      FROM oauth_links WHERE user_id = ?
    `).all(user.id);
    return res.status(200).json({
      status: "ok",
      providers: getProviderStatus(),
      connections: Object.fromEntries(connections.map((connection) => [connection.provider, {
        displayName: connection.display_name,
        username: connection.username,
        profileUrl: connection.profile_url,
        connectedAt: connection.created_at,
      }])),
    });
  }

  if (req.method === "GET" && (req.query.code || req.query.error || req.query.state)) {
    return completeAuthorization(req, res, providerId);
  }

  if (req.method === "GET") {
    const user = getCurrentUser(req);
    if (!user) return respondUnauthorized(res);
    return startAuthorization(req, res, user.id, providerId);
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
