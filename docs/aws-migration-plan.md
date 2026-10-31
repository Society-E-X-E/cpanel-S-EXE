# AWS Migration Plan — Society . E X E

**Project leadership:** Ahiezer Rada — Owner / Chief Technology Officer (CTO).

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


## CI evidence update — 2026-10-31

### Container build
- The GitHub Actions workflow `AWS container validation` completed successfully for commit `ffb2587ad388a0408a647c656e24eea49fef5ad0` (run ID `41241461445`, run number 4).
- Confirmed job: `build-container`; the `Build dashboard image (no push)` step succeeded.
- Interpretation: Docker image build is validated for that revision only. This is not runtime, database, security, or production-deployment certification.

### Runtime smoke test added
- Workflow updated in commit `f5e8a44279bbcf60214f17ea47983d713d8e17f0`.
- It now loads the built image into the CI runner, starts the container with a synthetic JWT secret, requests `http://127.0.0.1:3000/`, checks that the returned HTML contains `Society`, and stops the test container.
- The new run is GitHub Actions run ID `41242092318`, run number 6. Final GitHub Actions inspection confirms run `41242092318` completed with conclusion `success`. All steps passed: image build, container startup, HTTP response/assertion, container stop, post-build cleanup, and job completion.
- This smoke test uses no production secrets and does not publish an image or provision AWS infrastructure.

### Outstanding validation and safety gates
1. Existing Jest suites were found under `__tests__/` (including admin login/password-reset and OAuth helper tests). Added `npm test -- --runInBand` to `Dashboard build validation` in commit `7ee741e8228486ac80a2dfea601dba4b057911eb`; verify the new CI run and triage any failures.
2. Add a health endpoint only if it matches the application's actual runtime needs; do not invent a database-backed health check before a non-production database exists.
3. Validate authentication, role authorization, OAuth callbacks, OTP/email, and database connectivity in an isolated staging environment with test credentials.
4. Verify AWS credit eligibility and service cost before provisioning any paid resources.
5. Keep Vercel, Neon, production secrets, DNS, and production traffic unchanged until acceptance tests and rollback are verified.

### Failure investigation and corrective action
- `NodeJS with Webpack` run `41241461420` failed because the workflow ran `npm install` followed by `npx webpack`, but the repository does not declare `webpack-cli`; `npx` prompted to install it interactively and the non-interactive job exited with code 1. This workflow did not match the application's Next.js build system. Replaced it in commit `9ed71c006f18bf92e4e1118f5d23475a148560ee` with `Dashboard build validation`, which uses `npm ci` and `npm run build` on Node 22.x and 24.x. Both matrix jobs passed in run `41242658125` (Node 22.x and 24.x). Commit `7ee741e8228486ac80a2dfea601dba4b057911eb` adds the Jest suite to this workflow; its run result remains to be checked.
- `Create/Delete Branch for Pull Request` run `41241461434` failed at `neondatabase/create-branch-action@v6` with HTTP 401 while attempting to create preview branch `preview/pr-5-aws-migration/bootstrap-plan` in Neon project `muddy-star-75887710`. Most likely cause: `NEON_API_KEY` repository secret is invalid, expired, revoked, or lacks the required access. Do not print or rotate it blindly; an authorized repo/Neon owner must validate and replace the secret securely, then rerun the workflow. The failed create call did not report creating the branch.
- The `npm install` step in the legacy workflow reported 23 dependency vulnerabilities (3 low, 16 moderate, 4 high). This is a preliminary CI audit summary, not a verified current `npm audit` result from the locked install. Run a lockfile-based audit and triage exact package paths before remediation; do not apply `npm audit fix --force` blindly.
- The workflow failures are distinct from the successful AWS container validation run `41242092318`.


### Leadership and CI status correction — 2026-10-31

- Document owner / CTO: **Ahiezer Rada — Owner / Chief Technology Officer (CTO)**.
- Final status for GitHub Actions run `41242092318`: **success**. The complete job, including post-job cleanup, passed. This supersedes the earlier note that cleanup was still in progress.
- Documentation update commit for this correction is recorded in Git history; no AWS resources, production secrets, DNS, or production traffic were changed.


### Corrective actions documented — 2026-10-31

- Build workflow correction commit: `9ed71c006f18bf92e4e1118f5d23475a148560ee`.
- Workflow behavior changed from invoking unrelated Webpack CLI to testing the actual Next.js production build on Node 22 and 24, with locked dependency installation (`npm ci`).
- Outstanding human/security dependency: validate `NEON_API_KEY` securely in repository settings and Neon; do not disclose its value in issues, chat, logs, or source.
- No production infrastructure, database branches, DNS, secrets, or production traffic were intentionally changed as part of this investigation.


### CI confirmation update — 2026-10-31

- Run `41242658125` (`Dashboard build validation`) completed successfully on both Node.js 22.x and 24.x; `npm ci`, Next.js build, and job cleanup passed on both matrix jobs.
- Run `41242658122` (`AWS container validation`) completed successfully: Docker image build, container start, HTTP smoke test, container stop, and cleanup all passed.
- Run `41242658145` (`Create/Delete Branch for Pull Request`) failed in the Neon branch-creation step; Setup passed and deletion was skipped. Neon API credentials/access remain an owner action. Do not echo or expose `NEON_API_KEY`.
- Added Jest execution (`npm test -- --runInBand`) to the build-validation workflow in commit `7ee741e8228486ac80a2dfea601dba4b057911eb`. The run for this commit has not yet been confirmed in the available Actions result feed.
- Test files do exist under `__tests__/`, including admin login/password-reset and OAuth helper tests. This corrects the earlier statement that no Jest test files were found.

### Neon preview-branch validation — 2026-10-31

- After the repository owner updated/configured the Neon API key, the failed Create Neon Branch job was rerun.
- GitHub Actions run `41242953320`, job `124666631308`, completed successfully. Its log explicitly reports: `Branch preview/pr-5-aws-migration/bootstrap-plan created successfully`.
- This confirms the configured Neon API key worked for branch creation in this run. It does not prove the branch was subsequently deleted; the Delete Neon Branch job was skipped in this run, so verify cleanup/expiry and avoid creating duplicate preview branches.
- The database password and connection strings were inadvertently shared in chat. Treat that PostgreSQL password as exposed and rotate it in Neon promptly, then update authorized consumers without sharing secret values. This is separate from `NEON_API_KEY`.
- No production data migration or AWS provisioning was performed.

### Jest/build CI confirmation — 2026-10-31

- Workflow run `41242953327` (Dashboard build validation) completed successfully for both Node.js 22.x and 24.x.
- Both matrix jobs passed locked dependency installation (`npm ci`), automated tests (`npm test -- --runInBand`), and Next.js production build.
- Workflow run `41242953309` (AWS container validation) also completed successfully.
- These checks validate the tested commit in CI only; they do not certify production auth, database migration, or AWS deployment.

### Dependency audit pipeline added — 2026-10-31

- Updated `.github/workflows/webpack.yml` in commit `54b790bd45f0b3688d6fcf73c6fb615583cc02fa` to run `npm audit --json` against the lockfile-installed dependency tree and upload the JSON report as a short-retention artifact for each Node matrix job.
- The audit is diagnostic-only at this stage and will not fail the build merely because advisories exist. Review the severity summary and package paths before making targeted upgrades; do not run `npm audit fix --force` without compatibility review.
- The first audit result for this change is pending CI execution and must be recorded after the workflow finishes.
