export function oauthProviderErrorMessage(providerId, label, reason) {
  if (reason === "org_internal") {
    return "Google limita esta aplicación a usuarios de una organización. En Google Cloud, cambia el público de la pantalla de consentimiento a Externo o añade tu cuenta como usuario de prueba.";
  }
  if (reason === "invalid_scope") {
    return `${label} rechazó los permisos solicitados. Revisa los scopes y productos habilitados en la aplicación OAuth.`;
  }
  if (reason === "unauthorized_client" || reason === "invalid_client") {
    return `${label} rechazó la aplicación OAuth. Revisa su Client ID, Client Secret y el tipo de aplicación.`;
  }
  if (reason === "token-http-401" && providerId === "linkedin") {
    return `${label} rechazó la aplicación OAuth. Comprueba que el Client ID y el Client Secret pertenezcan a la misma aplicación y que esté habilitado "Sign In with LinkedIn using OpenID Connect".`;
  }
  if (reason === "profile-http-401" && providerId === "linkedin") {
    return "LinkedIn emitió el token, pero rechazó la solicitud del perfil. Confirma que OpenID Connect esté habilitado y que la aplicación tenga los permisos openid, profile y email.";
  }
  if (reason === "token-http-403" && providerId === "x") {
    return "X rechazó el intercambio del código por un token. Verifica que las credenciales sean de la misma aplicación, que OAuth 2.0 esté habilitado y que el callback coincida exactamente con la Redirect URI registrada.";
  }
  if (reason === "profile-http-403" && providerId === "x") {
    return "X emitió el token, pero denegó la lectura del perfil. Verifica el permiso users.read y que el nivel de acceso de la aplicación permita usar la API de X.";
  }
  if (reason === "invalid_request") {
    return `${label} rechazó la solicitud. Verifica que el Redirect URI registrado coincida exactamente con el de esta aplicación.`;
  }
  if (reason === "access_denied") {
    return `La autorización de ${label} fue denegada o está restringida por la organización.`;
  }
  return `${label} rechazó la autorización. Revisa la configuración OAuth y vuelve a intentarlo.`;
}
