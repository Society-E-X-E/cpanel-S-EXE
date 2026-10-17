const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
const dotenv = require("dotenv");
const schemaStatements = require("../lib/db-schema.cjs");

dotenv.config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;

async function main() {
  const sourcePath = path.join(process.cwd(), "data", "app.db");
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL in your local environment before running this migration.");
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error("The local SQLite database was not found at data/app.db.");
  }

  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  const target = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
  });
  let stage = "source";
  try {
    const sourceTables = new Set(source.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    ).all().map(({ name }) => name));
    if (!sourceTables.has("staff_users")) {
      throw new Error("The local SQLite database has no staff_users table.");
    }
    const userColumns = new Set(source.prepare("PRAGMA table_info(staff_users)").all().map(({ name }) => name));
    for (const required of ["id", "username", "password_hash", "role", "created_at"]) {
      if (!userColumns.has(required)) {
        throw new Error("The local staff_users table is missing a required dashboard column.");
      }
    }
    const optionalUserColumns = ["email", "phone", "bio", "social_links"];
    const userFields = ["id", "username", "password_hash", "role", ...optionalUserColumns, "created_at"]
      .map((name) => userColumns.has(name) ? name : `'' AS ${name}`)
      .join(", ");
    const users = source.prepare(`SELECT ${userFields} FROM staff_users ORDER BY id`).all();

    let links = [];
    if (sourceTables.has("oauth_links")) {
      const linkColumns = new Set(source.prepare("PRAGMA table_info(oauth_links)").all().map(({ name }) => name));
      const requiredLinkColumns = [
        "id", "user_id", "provider", "provider_user_id", "access_token_encrypted", "created_at", "updated_at",
      ];
      if (requiredLinkColumns.some((name) => !linkColumns.has(name))) {
        throw new Error("The local oauth_links table is missing required dashboard columns.");
      }
      const optionalLinkColumns = [
        "display_name", "username", "profile_url", "avatar_url", "token_expires_at", "scopes",
      ];
      const linkFields = [...requiredLinkColumns.slice(0, 4), ...optionalLinkColumns, ...requiredLinkColumns.slice(4)]
        .map((name) => linkColumns.has(name) ? name : `'' AS ${name}`)
        .join(", ");
      links = source.prepare(`SELECT ${linkFields} FROM oauth_links ORDER BY id`).all();
    }

    stage = "connect";
    const client = await target.connect();
    try {
      stage = "schema";
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [738204190]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        )
      `);
      const migration = await client.query(
        "SELECT version FROM schema_migrations WHERE version = $1",
        ["001_initial"],
      );
      if (migration.rows.length === 0) {
        for (const statement of schemaStatements) await client.query(statement);
        await client.query("INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)", [
          "001_initial",
          new Date().toISOString(),
        ]);
      }

      const existing = await client.query(`
        SELECT
          (SELECT count(*) FROM staff_users) AS users,
          (SELECT count(*) FROM oauth_links) AS links
      `);
      if (Number(existing.rows[0].users) || Number(existing.rows[0].links)) {
        throw new Error("The PostgreSQL database already contains account data; migration stopped without importing.");
      }

      stage = "import";
      for (const user of users) {
        await client.query(`
          INSERT INTO staff_users (id, username, password_hash, role, email, phone, bio, social_links, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          user.id, user.username, user.password_hash, user.role, user.email,
          user.phone, user.bio, user.social_links, user.created_at,
        ]);
      }
      for (const link of links) {
        await client.query(`
          INSERT INTO oauth_links (
            id, user_id, provider, provider_user_id, display_name, username, profile_url, avatar_url,
            access_token_encrypted, token_expires_at, scopes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          link.id, link.user_id, link.provider, link.provider_user_id, link.display_name,
          link.username, link.profile_url, link.avatar_url, link.access_token_encrypted,
          link.token_expires_at, link.scopes, link.created_at, link.updated_at,
        ]);
      }

      await client.query(`
        SELECT setval(pg_get_serial_sequence('staff_users', 'id'),
          COALESCE((SELECT max(id) FROM staff_users), 1), EXISTS(SELECT 1 FROM staff_users))
      `);
      await client.query(`
        SELECT setval(pg_get_serial_sequence('oauth_links', 'id'),
          COALESCE((SELECT max(id) FROM oauth_links), 1), EXISTS(SELECT 1 FROM oauth_links))
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.log(`Imported ${users.length} team account(s) and ${links.length} social connection(s).`);
  } catch (error) {
    error.migrationStage = stage;
    throw error;
  } finally {
    source.close();
    await target.end();
  }
}

main().catch((error) => {
  const code = error.code || error.name || "unknown";
  console.error("SQLite to PostgreSQL migration failed.", `stage=${error.migrationStage || "preflight"}`, `code=${code}`);
  process.exitCode = 1;
});
