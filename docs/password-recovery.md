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
3. Configure these server-side environment variables in the deployment
   platform and local development environment:

   - `AWS_REGION`: the SES region containing the verified sender identity.
   - `SES_FROM_EMAIL`: an address authorized by that SES identity.
   - `OTP_HASH_SECRET`: a random secret of at least 32 characters, used only
     to HMAC OTPs and rate-limit keys. Generate a distinct value, for example
     with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - AWS credentials via the platform's workload identity/role where available.
     If static credentials are unavoidable, use a dedicated IAM identity with
     only `ses:SendEmail` for the verified sender identity; set
     `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as protected deployment
     secrets. Never expose these values to client-side variables or commit
     them to the repository.

4. Sign in to AWS locally with the account/role for the SES region, then
   publish or update the dashboard's managed template:

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
   dashboard's runtime sender role. Runtime delivery uses `ses:SendEmail`.
   Templates are regional, so publish them separately to every region used by
   the application.

5. Deploy and test delivery with a verified team mailbox. Check SES sending
   metrics, bounce/complaint handling, and the application's server logs before
   enabling recovery for the team.

The dashboard returns a generic response to password-reset requests whether
or not an account exists, to reduce account enumeration. Codes contain eight
digits, expire after 10 minutes, are limited to five verification attempts,
are single-use, and have per-IP and per-account request limits. A successful
reset increments the account's token version, invalidating existing sessions.
Failed password logins are throttled by IP and by the IP/username pair; the
dashboard blocks after eight failures for the same pair or 30 failures from
one IP in a 15-minute window.

Do not enable production password recovery until the SES identity, production
send access, protected secrets, database migration, and delivery path have
been verified in the target environment. Configure edge rate limiting at the
hosting/CDN layer as an additional control, and ensure the deployment replaces
client-supplied `x-real-ip` values with a trusted client address before the
application uses that header for rate-limit keys.
