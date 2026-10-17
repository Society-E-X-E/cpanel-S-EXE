# PostgreSQL deployment

The dashboard uses Neon PostgreSQL in production. Configure `DATABASE_URL` with the pooled Neon connection string in Vercel and in the local environment used to run the import. Keep the existing `OAUTH_TOKEN_ENCRYPTION_KEY` unchanged so stored provider tokens remain decryptable.

## Import the existing local database

1. Back up `data/app.db` securely. It contains password hashes and encrypted OAuth tokens.
2. Set `DATABASE_URL` locally without committing it. The importer loads `.env.local` automatically.
3. Run `npm run db:migrate:sqlite` before deploying or opening the dashboard against the new database.

The importer copies team accounts and linked social identities in one PostgreSQL transaction. It intentionally skips short-lived OAuth authorization transactions. It refuses to import into a database that already contains team accounts or social connections; investigate and resolve that condition rather than deleting production data.

After the import succeeds, configure the same `DATABASE_URL` and `OAUTH_TOKEN_ENCRYPTION_KEY` in Vercel. The application applies its versioned schema migration on first database use. Keep the SQLite file as a protected backup until login, profiles, roles, and OAuth connections have been verified in production.

If starting with an empty database instead, configure `OWNER_USERNAME` and `OWNER_PASSWORD` in Vercel to create the initial Owner account. The password must be 12–128 characters.
