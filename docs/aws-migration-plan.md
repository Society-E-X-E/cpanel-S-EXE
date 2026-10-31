# AWS Migration Plan — Society . E X E

Status: planning baseline; no production resources created by this document.

## Budget constraint

The AWS console screenshot provided on 2026-10-31 shows promotional credits totaling USD 120:
- USD 100 AWS Free Tier credit, shown with expiry 2027-10-17.
- USD 20 Explore AWS: Set up a cost budget credit, shown with expiry 2027-10-17.

Before provisioning, verify the credit terms and eligible services in Billing. Treat USD 120 as a hard ceiling for the migration effort, not a guaranteed free-running budget. Avoid services that can continue billing after credits are exhausted unless a cost estimate and alerts are in place.

## Target outcome

Move the public website, dashboard runtime, secrets/integrations, observability, and PostgreSQL data plane to AWS. Do not retire Vercel or Neon until the AWS deployment passes acceptance tests and rollback is proven.

## Current evidence

- AWS account 655503101793 is the user-authorized production target.
- Amplify app `web-society-exe` exists in us-east-1. Its main branch is configured for Next.js SSR with `.next` artifacts.
- The public website repo configures Next.js static export (`output: "export"`) and its GitHub Pages workflow publishes `out`. Deployment modes conflict and must be resolved.
- Dashboard currently runs on Vercel; database project `db-dashboad-exe` runs PostgreSQL 18 on Neon in eu-central-1.
- Dashboard uses JWT, RBAC, OAuth integrations, OTP/email workflows, AWS Secrets Manager and SES integrations. `OAUTH_TOKEN_ENCRYPTION_KEY` must be preserved or tokens migrated safely.
- Read-only AWS inventory found no S3 buckets, RDS instances, Lambda functions, Secrets Manager secrets, KMS keys, or CloudTrail trails in the three checked regions (us-east-1, us-west-2, eu-central-1). This is not a global inventory.
- Six Vercel environment variables were flagged as readable-secret metadata. This is a configuration risk to remediate carefully; it does not prove compromise.
- The Amplify job failed in BUILD on 2026-10-28; exact compiler output still needs retrieval.
- Amplify domain association reports a CAA policy issue for society-exe.site. Do not change DNS until current records and DNS ownership are verified.
- The bucket `society-exe-inbound-emails` was seen in account 876760932328, not the selected production account. Its configuration could not be inspected due to access denial.

## Budget-first implementation sequence

### Stage 0 — no-cost preparation
1. Confirm AWS credit eligibility and current billing; establish budget alerts.
2. Resolve public-site mode: static export if no server runtime is needed; SSR only if required by app behavior.
3. Build an AWS deployment path in a separate branch and validate builds locally/CI.
4. Prepare least-privilege IAM roles, secret inventory, database schema/data migration scripts, smoke tests, and rollback runbook.
5. Do not copy production secret values into source control or logs.

### Stage 1 — minimal AWS deployment within the same credit budget
1. Deploy the public static site to S3 + CloudFront or a compatible Amplify static deployment, choosing the lower-cost validated option.
2. Package dashboard as a container and compare App Runner vs ECS Fargate using actual current prices and expected uptime before provisioning. Prefer a stop/start or test environment if continuous compute would threaten the credit ceiling.
3. Create the minimum required secrets and logging only after pricing/eligibility checks.
4. Validate TLS, auth/RBAC, OAuth, OTP, email, database connectivity, health checks, and observability.
5. Run a controlled database migration into an AWS PostgreSQL target only if a realistic cost estimate fits the remaining credit and recovery requirements. If a managed database would consume the budget unsafely, stage and test the migration scripts now and provision the target at the last safe point within the same credit budget—not as an assumed future funding phase.

### Stage 2 — cutover, still funded from the same USD 120 ceiling
1. Run integrity checks and application acceptance tests.
2. Lower DNS TTL ahead of cutover when current DNS is verified.
3. Switch traffic only after a successful staging period and explicit cutover checklist.
4. Keep Vercel and Neon intact during the rollback window; avoid double-running paid AWS services longer than necessary.
5. Confirm AWS billing and service health after cutover. Retire Vercel/Neon only after rollback is no longer needed and all data/secret dependencies are accounted for.

Both preparation and implementation/cutover are included in the same USD 120 credit constraint. The stages are sequencing, not separate funding rounds.

## Guardrails

- No deletion of the existing Vercel project or Neon database before verified cutover.
- No production DNS change before CAA and current DNS records are documented.
- No blind rotation of JWT/OAuth encryption keys.
- No broad SCP removal or permission bypass.
- No deployment without a rollback path.
- Cost Explorer and Budgets alerts are not hard spending caps; alerts can lag.
- Stop provisioning when projected remaining eligible credit is insufficient for validation and rollback.

## Acceptance criteria

- Both website and dashboard run on AWS under the intended domains.
- PostgreSQL migration reconciles row counts and critical relationships; authentication and OTP flows pass.
- OAuth tokens remain decryptable or have been safely re-authorized.
- Secrets are not exposed in source, logs, or client bundles.
- TLS, least-privilege access, audit trail, health monitoring, backup/restore test, and rollback procedure are verified.
- Vercel and Neon are not removed until all criteria pass.

## Open evidence tasks

- Retrieve exact Amplify BUILD logs.
- Verify current DNS records, CAA records, and DNS provider.
- Confirm credit eligibility, billing state, and current budget.
- Confirm the dashboard's actual Next.js server requirements and production environment variable names without exposing values.
- Inventory AWS Organizations SCP inheritance and resources in all relevant regions/accounts.
