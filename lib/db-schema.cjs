module.exports = [
  `CREATE TABLE staff_users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    social_links TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`,
  "CREATE UNIQUE INDEX staff_users_username_lower_unique ON staff_users (lower(username))",
  `CREATE TABLE oauth_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '',
    profile_url TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    access_token_encrypted TEXT NOT NULL,
    token_expires_at TEXT NOT NULL DEFAULT '',
    scopes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, provider),
    UNIQUE(provider, provider_user_id)
  )`,
  `CREATE TABLE oauth_transactions (
    state_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    code_verifier_encrypted TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE oauth_login_transactions (
    state_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code_verifier_encrypted TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];
