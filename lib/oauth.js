import crypto from "crypto";

const PROVIDERS = {
  github: {
    label: "GitHub",
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    userEndpoint: "https://api.github.com/user",
    scopes: ["read:user"],
  },
  gitlab: {
    label: "GitLab",
    clientId: () => process.env.GITLAB_CLIENT_ID,
    clientSecret: () => process.env.GITLAB_CLIENT_SECRET,
    authorizationEndpoint: "https://gitlab.com/oauth/authorize",
    tokenEndpoint: "https://gitlab.com/oauth/token",
    userEndpoint: "https://gitlab.com/api/v4/user",
    scopes: ["read_user"],
  },
  linkedin: {
    label: "LinkedIn",
    clientId: () => process.env.LINKEDIN_CLIENT_ID,
    clientSecret: () => process.env.LINKEDIN_CLIENT_SECRET,
    authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
    tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
    userEndpoint: "https://api.linkedin.com/v2/userinfo",
    scopes: ["openid", "profile"],
  },
  google: {
    label: "Google",
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    userEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
    scopes: ["openid", "profile"],
  },
  x: {
    label: "X",
    clientId: () => process.env.X_CLIENT_ID,
    clientSecret: () => process.env.X_CLIENT_SECRET,
    authorizationEndpoint: "https://x.com/i/oauth2/authorize",
    tokenEndpoint: "https://api.x.com/2/oauth2/token",
    userEndpoint: "https://api.x.com/2/users/me?user.fields=name,username",
    scopes: ["users.read"],
  },
};

export function getProvider(provider) {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, provider) ? PROVIDERS[provider] : null;
}

export function getProviderStatus() {
  return Object.entries(PROVIDERS).map(([id, provider]) => ({
    id,
    label: provider.label,
    configured: Boolean(
      provider.clientId() &&
      provider.clientSecret() &&
      process.env.APP_BASE_URL &&
      process.env.OAUTH_TOKEN_ENCRYPTION_KEY?.length >= 32
    ),
  }));
}

export function getProviderCredentials(provider) {
  const config = getProvider(provider);
  if (!config) return null;
  const clientId = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) return null;
  return { ...config, clientId, clientSecret };
}

export function getRedirectUri(provider) {
  const origin = process.env.APP_BASE_URL;
  if (!origin) throw new Error("APP_BASE_URL is required for OAuth callbacks.");

  const base = new URL(origin);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/" ||
    !["http:", "https:"].includes(base.protocol) ||
    (process.env.NODE_ENV === "production" && base.protocol !== "https:")
  ) {
    throw new Error("APP_BASE_URL must be an HTTP(S) origin (HTTPS in production).");
  }
  return new URL(`/api/admin/oauth/${provider}`, base.origin).toString();
}

export function createPkcePair() {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function encryptOAuthSecret(value) {
  const secret = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must contain at least 32 characters.");
  }
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptOAuthSecret(payload) {
  const secret = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must contain at least 32 characters.");
  }
  const [ivPart, tagPart, dataPart] = String(payload).split(".");
  if (!ivPart || !tagPart || !dataPart) throw new Error("Invalid encrypted OAuth secret.");

  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function fetchJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok) throw new Error("OAuth provider request failed.");
  return body;
}

export async function exchangeOAuthCode(providerId, code, verifier, redirectUri) {
  const provider = getProviderCredentials(providerId);
  if (!provider) throw new Error("OAuth provider is not configured.");

  const fields = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
  });

  const token = await fetchJson(provider.tokenEndpoint, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: fields,
  });
  if (typeof token.access_token !== "string" || !token.access_token || (token.token_type && token.token_type.toLowerCase() !== "bearer")) {
    throw new Error("OAuth provider did not return a valid access token.");
  }

  let profile;
  if (providerId === "github") {
    profile = await fetchJson(provider.userEndpoint, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token.access_token}`, "X-GitHub-Api-Version": "2022-11-28" },
    });
    profile = {
      subject: profile.id,
      displayName: profile.name || profile.login,
      username: profile.login,
      profileUrl: profile.html_url,
    };
  } else if (providerId === "gitlab") {
    profile = await fetchJson(provider.userEndpoint, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    profile = {
      subject: profile.id,
      displayName: profile.name || profile.username,
      username: profile.username,
      profileUrl: profile.web_url,
    };
  } else if (providerId === "linkedin") {
    profile = await fetchJson(provider.userEndpoint, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    profile = {
      subject: profile.sub,
      displayName: profile.name || profile.email || "",
      username: profile.email || "",
      profileUrl: "",
    };
  } else if (providerId === "google") {
    profile = await fetchJson(provider.userEndpoint, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    profile = {
      subject: profile.sub,
      displayName: profile.name || profile.email || "",
      username: profile.email || "",
      profileUrl: "",
    };
  } else {
    const response = await fetchJson(provider.userEndpoint, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    profile = {
      subject: response.data?.id,
      displayName: response.data?.name || response.data?.username || "",
      username: response.data?.username || "",
      profileUrl: response.data?.username ? `https://x.com/${encodeURIComponent(response.data.username)}` : "",
    };
  }

  if (profile.subject === undefined || profile.subject === null || !String(profile.subject)) {
    throw new Error("OAuth provider returned an incomplete user profile.");
  }

  const expiresAt = Number.isFinite(Number(token.expires_in))
    ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
    : "";
  return {
    profile: {
      subject: String(profile.subject),
      displayName: String(profile.displayName || "").slice(0, 200),
      username: String(profile.username || "").slice(0, 200),
      profileUrl: typeof profile.profileUrl === "string" && profile.profileUrl.startsWith("https://") ? profile.profileUrl : "",
    },
    accessToken: token.access_token,
    expiresAt,
    scopes: provider.scopes.join(" "),
  };
}
