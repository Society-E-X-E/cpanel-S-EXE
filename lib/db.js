import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";
import { hashSync } from "bcryptjs";

dotenv.config();

const dbPath = path.join(process.cwd(), "data", "app.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.prepare(`
  CREATE TABLE IF NOT EXISTS staff_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    social_links TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )
`).run();

const staffColumns = new Set(db.prepare("PRAGMA table_info(staff_users)").all().map(({ name }) => name));
const profileColumns = [
  ["email", "TEXT NOT NULL DEFAULT ''"],
  ["phone", "TEXT NOT NULL DEFAULT ''"],
  ["bio", "TEXT NOT NULL DEFAULT ''"],
  ["social_links", "TEXT NOT NULL DEFAULT '{}'"],
];

for (const [name, definition] of profileColumns) {
  if (!staffColumns.has(name)) {
    db.prepare(`ALTER TABLE staff_users ADD COLUMN ${name} ${definition}`).run();
  }
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS oauth_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
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
    FOREIGN KEY(user_id) REFERENCES staff_users(id) ON DELETE CASCADE,
    UNIQUE(user_id, provider),
    UNIQUE(provider, provider_user_id)
  )
`).run();

const oauthLinkColumns = new Set(db.prepare("PRAGMA table_info(oauth_links)").all().map(({ name }) => name));
if (!oauthLinkColumns.has("avatar_url")) {
  db.prepare("ALTER TABLE oauth_links ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''").run();
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS oauth_transactions (
    state_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    code_verifier_encrypted TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES staff_users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS oauth_login_transactions (
    state_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code_verifier_encrypted TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`).run();

const hasOwner = db.prepare("SELECT id FROM staff_users WHERE role = 'owner' LIMIT 1").get();
const ownerUsername = process.env.OWNER_USERNAME?.trim();
const ownerPassword = process.env.OWNER_PASSWORD;
if (!hasOwner && (ownerUsername || ownerPassword)) {
  if (
    !ownerUsername ||
    !/^[\p{L}\p{N}._-]{3,32}$/u.test(ownerUsername) ||
    typeof ownerPassword !== "string" ||
    ownerPassword.length < 12 ||
    ownerPassword.length > 128
  ) {
    throw new Error("Configure OWNER_USERNAME and an OWNER_PASSWORD of 12-128 characters to create the first Owner.");
  }
  db.prepare(`
    INSERT INTO staff_users (username, password_hash, role, email, created_at)
    VALUES (?, ?, 'owner', ?, ?)
  `).run(
    ownerUsername,
    hashSync(ownerPassword, 12),
    process.env.OWNER_EMAIL?.trim() || "",
    new Date().toISOString(),
  );
}

export default db;
