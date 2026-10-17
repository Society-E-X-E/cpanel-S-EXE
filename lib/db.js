import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import dotenv from "dotenv";
import { hash } from "bcryptjs";
import schemaStatements from "./db-schema.cjs";

dotenv.config();

neonConfig.webSocketConstructor = ws;

const accountSecurityMigration = [
  "ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS email_verified_at TEXT",
  "ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0",
  `CREATE TABLE IF NOT EXISTS email_otp_challenges (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
    email_snapshot TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    request_ip_hash TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
  )`,
  "CREATE INDEX IF NOT EXISTS email_otp_challenges_user_purpose_idx ON email_otp_challenges (user_id, purpose, created_at DESC)",
  `CREATE TABLE IF NOT EXISTS email_otp_rate_limits (
    scope_key TEXT PRIMARY KEY,
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS email_otp_rate_limits_window_started_idx ON email_otp_rate_limits (window_started_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS staff_users_verified_email_lower_unique ON staff_users (lower(email)) WHERE email_verified_at IS NOT NULL AND email <> ''",
];

let pool;
let migrationPromise;
let ownerBootstrapPromise;

function getPool() {
  const connectionString = process.env.EXE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("EXE_DATABASE_URL or DATABASE_URL must be configured to use the PostgreSQL database.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function migrateSchema() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      let client;
      try {
        client = await getPool().connect();
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [738204190]);
        await client.query(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
          )
        `);
        const { rows } = await client.query(
          "SELECT version FROM schema_migrations WHERE version = $1",
          ["001_initial"],
        );
        if (rows.length === 0) {
          for (const statement of schemaStatements) {
            await client.query(statement);
          }
          await client.query(
            "INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)",
            ["001_initial", new Date().toISOString()],
          );
        }
        const securityMigration = await client.query(
          "SELECT version FROM schema_migrations WHERE version = $1",
          ["002_account_security"],
        );
        if (securityMigration.rows.length === 0) {
          for (const statement of accountSecurityMigration) {
            await client.query(statement);
          }
          await client.query(
            "INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)",
            ["002_account_security", new Date().toISOString()],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        migrationPromise = undefined;
        if (client) {
          try {
            await client.query("ROLLBACK");
          } catch (rollbackError) {
            console.error("PostgreSQL schema migration rollback failed:", rollbackError);
          }
        }
        throw error;
      } finally {
        client?.release();
      }
    })();
  }
  return migrationPromise;
}

async function bootstrapOwner() {
  if (!ownerBootstrapPromise) {
    ownerBootstrapPromise = (async () => {
      const ownerUsername = process.env.OWNER_USERNAME?.trim();
      const ownerPassword = process.env.OWNER_PASSWORD;
      const { rows } = await getPool().query(
        "SELECT id FROM staff_users WHERE role = $1 LIMIT 1",
        ["owner"],
      );
      if (rows.length || (!ownerUsername && !ownerPassword)) return;
      if (
        !ownerUsername ||
        !/^[\p{L}\p{N}._-]{3,32}$/u.test(ownerUsername) ||
        typeof ownerPassword !== "string" ||
        ownerPassword.length < 12 ||
        ownerPassword.length > 128
      ) {
        throw new Error("Configure OWNER_USERNAME and an OWNER_PASSWORD of 12-128 characters to create the first Owner.");
      }

      const passwordHash = await hash(ownerPassword, 12);
      await getPool().query(`
        INSERT INTO staff_users (username, password_hash, role, email, created_at)
        VALUES ($1, $2, 'owner', $3, $4)
        ON CONFLICT DO NOTHING
      `, [
        ownerUsername,
        passwordHash,
        process.env.OWNER_EMAIL?.trim() || "",
        new Date().toISOString(),
      ]);
    })().catch((error) => {
      ownerBootstrapPromise = undefined;
      throw error;
    });
  }
  return ownerBootstrapPromise;
}

const db = {
  async query(text, params = []) {
    return getPool().query(text, params);
  },
  async migrate() {
    await migrateSchema();
    await bootstrapOwner();
  },
};

export default db;
