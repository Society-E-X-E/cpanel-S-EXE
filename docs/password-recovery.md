# Password changes and email recovery

New accounts created from **Team → Add member** are marked to change their
initial password. The first password login is restricted to the password-change
screen; protected dashboard APIs reject the temporary session until the change
succeeds. Password changes require the current password, use bcrypt hashes,
and revoke existing sessions.

Password recovery is only available through the account's verified email
address. Members verify their address from **Profile**. Changing the address
clears its verification state. Unverified legacy accounts must sign in, set an
address they control, and complete email verification before they can recover
their password.

## Amazon SES setup

1. Verify the sending domain (recommended) or sender address in Amazon SES.
   Publish the domain's DKIM records and configure SPF/DMARC for the sending
   domain.
2. Request production access for the SES region if the AWS account is still in
   the SES sandbox. The sandbox only permits sending to verified recipients.
3. Store the OTP HMAC secret in AWS Secrets Manager in the same region as the
   application configuration. This project expects a JSON secret containing
   a string property named `OTP_HASH_SECRET`. Configure these server-side
   environment variables in Vercel:

   - `AWS_REGION`: the AWS region containing both the SES identity and OTP
     secret (for example, `us-east-2`).
   - `SES_FROM_EMAIL`: an address authorized by that SES identity.
   - `OTP_HASH_SECRET_ID`: the Secrets Manager secret name or ARN (for example,
     `OTP_HASH_SECRET`). The value is fetched server-side and cached in memory
     for up to five minutes.
   - `AWS_ROLE_ARN`: the ARN of a dedicated IAM role trusted by Vercel OIDC.
     Use the role only for the production Vercel environment and restrict its
     trust policy to this Vercel team, project, and environment. The AWS SDK
     uses short-lived federated credentials; do not put AWS access keys in
     Vercel variables or `.env.local`.

   Grant that runtime role `secretsmanager:GetSecretValue` only on the exact
   ARN of the `OTP_HASH_SECRET` secret in the selected region. Add
   `kms:Decrypt` for the specific KMS key only if the secret uses a
   customer-managed key. The runtime role sends SES-managed templates, so
   grant `ses:SendTemplatedEmail` only on the sender identities used by the
   dashboard. For this domain, restrict the resources to
   `arn:aws:ses:REGION:ACCOUNT:identity/society-exe.site` and
   `arn:aws:ses:REGION:ACCOUNT:identity/*@society-exe.site`; the wildcard
   covers only email identities at that domain. Do not grant
   template-management permissions to the runtime role. For local development,
   use an AWS CLI profile/SSO; remove long-lived access keys from `.env.local`.

4. Sign in to AWS locally with a profile for the SES region, then publish or
   update the dashboard's managed template:

   ```powershell
   aws sso login
   npm run ses:template
   ```

   The command reads `AWS_REGION` from `.env.local` (or `.env`) and uses the
   AWS SDK's default credential chain. It creates or updates the
   `SocietySecurityCodeV1` template in that region. The template definition
   lives in [templates/security-code.json](../templates/security-code.json);
   deployment requires `ses:GetEmailTemplate` and either
   `ses:CreateEmailTemplate` or `ses:UpdateEmailTemplate`. Keep those
   management permissions on the deployment/operator identity, not the
   dashboard's runtime sender role. Runtime delivery uses
   `ses:SendTemplatedEmail`.
   Templates are regional, so publish them separately to every region used by
   the application.

5. Configure Vercel OIDC with AWS by adding an IAM OIDC provider for Vercel,
   then create a role whose trust policy restricts the `sub` claim to the
   exact team, project, and `production` environment, and whose `aud` claim
   matches the Vercel team. Follow Vercel's current
   [AWS OIDC setup guide](https://vercel.com/docs/oidc/aws); add the role ARN
   as `AWS_ROLE_ARN` in Vercel. The dashboard's AWS clients use the Vercel
   OIDC credential provider whenever this role ARN is configured. Do not grant
   this role template-management permissions.

6. Deploy and test delivery with a verified team mailbox. Check SES sending
   metrics, bounce/complaint handling, and the application's server logs before
   enabling recovery for the team.

The dashboard returns a generic response to password-reset requests whether
or not an account exists, to reduce account enumeration. Codes contain eight
digits, expire after 10 minutes, are limited to five verification attempts,
are single-use, and have per-IP and per-account request limits. A successful
reset increments the account's token version, invalidating existing sessions.
Replacing the Secrets Manager value changes the HMAC key and invalidates OTP
challenges created under the previous key; wait for outstanding codes to
expire or invalidate them before rotating the secret.
Failed password logins are throttled by IP and by the IP/username pair; the
dashboard blocks after eight failures for the same pair or 30 failures from
one IP in a 15-minute window.

Do not enable production password recovery until the SES identity, production
send access, protected secrets, database migration, and delivery path have
been verified in the target environment. Configure edge rate limiting at the
hosting/CDN layer as an additional control, and ensure the deployment replaces
client-supplied `x-real-ip` values with a trusted client address before the
application uses that header for rate-limit keys.
