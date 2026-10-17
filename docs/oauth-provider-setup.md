# Social OAuth provider setup

The social-account callbacks use the production origin `https://dashboard.society-exe.site`. Register each provider's callback URL exactly as shown below; it must not point to the site homepage.

## GitLab

1. In GitLab, open **User Settings → Applications** and create an OAuth application.
2. Set the redirect URI to `https://dashboard.society-exe.site/api/admin/oauth/gitlab`.
3. Enable the `read_user` scope for the application. The dashboard requests this exact scope to retrieve the signed-in GitLab account's basic profile.
4. Configure `GITLAB_CLIENT_ID` and `GITLAB_CLIENT_SECRET` in the deployment environment and redeploy.

If GitLab reports that the requested scope is invalid, confirm that `read_user` is selected for this specific application. The scope is not a GitLab group role or project permission.

## LinkedIn

1. In the LinkedIn Developer Portal, select the app and open **Products**.
2. Request/enable **Sign In with LinkedIn using OpenID Connect**.
3. In **Auth → Authorized redirect URLs**, add `https://dashboard.society-exe.site/api/admin/oauth/linkedin`.
4. Configure `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in the deployment environment and redeploy.
5. Connect LinkedIn again from the dashboard profile and approve the requested `openid`, `profile`, and `email` permissions.

LinkedIn profile data is stored only after its authorization callback completes successfully. The app reads the OpenID Connect `userinfo` response; `email` is optional at LinkedIn and is not used as the stable account identifier.

## X

1. In the X Developer Portal, open the project app's **User authentication settings** and enable OAuth 2.0.
2. Select a **Web App** / confidential client type and enable **Read** access.
3. Set the callback/redirect URI to `https://dashboard.society-exe.site/api/admin/oauth/x`. Set a website URL if the portal requires it.
4. Configure `X_CLIENT_ID` and `X_CLIENT_SECRET` from the OAuth 2.0 client settings in the deployment environment and redeploy.
5. Reconnect X from the dashboard profile and approve `users.read`.

The X authorization-code exchange uses PKCE and HTTP Basic client authentication. The callback URL must exactly match the URL registered in the X app.

## General checks

- Keep the OAuth client ID and secret in server-side deployment environment variables only. Do not use `NEXT_PUBLIC_` variables or put credentials in a redirect URL.
- Set `APP_BASE_URL` to `https://dashboard.society-exe.site` in the production environment.
- After changing provider settings or environment variables, redeploy and retry the connection from the dashboard.
- A provider connection appears in the profile only after the callback succeeds and the account identity has been saved.
