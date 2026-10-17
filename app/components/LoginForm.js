"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { oauthProviderErrorMessage } from "./oauthMessages";

const oauthProviders = [
  { id: "google", label: "Google", icon: "fa-brands fa-google" },
  { id: "github", label: "GitHub", icon: "fa-brands fa-github" },
  { id: "gitlab", label: "GitLab", icon: "fa-brands fa-gitlab" },
];

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState([]);
  const [resetMode, setResetMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    for (const key of ["svpSubmissions", "svpLastSubmission", "svpFlow"]) {
      localStorage.removeItem(key);
    }
    const url = new URL(window.location.href);
    const oauthStatus = url.searchParams.get("oauth");
    const providerId = url.searchParams.get("provider");
    const provider = oauthProviders.find((item) => item.id === providerId);
    if (oauthStatus === "unlinked") {
      setMessage("Esta cuenta no está vinculada a un miembro del equipo. Inicia sesión con tu usuario y contraseña y conecta la cuenta desde Mi perfil.");
    } else if (oauthStatus === "provider-error" && provider) {
      const reason = url.searchParams.get("reason");
      setMessage(oauthProviderErrorMessage(provider.id, provider.label, reason));
    } else if (oauthStatus === "error" && provider) {
      setMessage(`No se pudo iniciar sesión con ${provider.label}. Inténtalo de nuevo.`);
    } else if (oauthStatus === "unavailable" && provider) {
      setMessage(`${provider.label} aún no está configurado para iniciar sesión.`);
    }
    if (oauthStatus) window.history.replaceState({}, "", `${url.pathname}${url.hash}`);

    fetch("/api/admin/oauth/google?action=login-status")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudieron cargar los proveedores.");
        setConfiguredProviders(data.providers.filter((item) => item.configured).map((item) => item.id));
      })
      .catch((error) => {
        console.error("OAuth provider status request failed:", error);
      });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "No se pudo iniciar sesión.");
        return;
      }
      router.replace(data.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (error) {
      console.error("Login request failed:", error);
      setMessage("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    setResetBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: resetEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo procesar la solicitud.");
      setResetCodeSent(true);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setResetBusy(false);
    }
  }

  async function confirmPasswordReset(event) {
    event.preventDefault();
    setResetBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          email: resetEmail,
          code: resetCode,
          newPassword: resetPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo restablecer la contraseña.");
      setResetMode(false);
      setResetCodeSent(false);
      setResetCode("");
      setResetPassword("");
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Society . E X E">
        <div className="brand-lockup">
          <span className="brand-mark">.EXE</span>
          <span className="brand-name">Society . E X E</span>
        </div>
        <div className="login-pitch">
          <span className="eyebrow">Workspace privado</span>
          <h1>Ideas seguras.<br />Trabajo enfocado.</h1>
          <p>El espacio de trabajo interno para gestionar el sitio y los proyectos de Society . E X E.</p>
        </div>
        <div className="login-legal">
          <span>Acceso exclusivo para miembros autorizados.</span>
        </div>
      </section>

      <section className="login-panel-wrap">
        <div className="login-panel">
          <div className="brand-lockup" style={{ marginBottom: "2.2rem" }}>
            <span className="brand-mark">.EXE</span>
            <span className="brand-name">Society . E X E</span>
          </div>
          <span className="eyebrow">{resetMode ? "Recuperación segura" : "Bienvenido de nuevo"}</span>
          <h2 style={{ marginTop: ".55rem" }}>{resetMode ? "Restablecer contraseña" : "Inicia sesión"}</h2>
          <p>{resetMode ? "Usa el correo verificado de tu cuenta para recibir un código de un solo uso." : "Usa la cuenta del equipo que te asignaron para continuar."}</p>
          {!resetMode ? (
            <>
              <form className="form-stack" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="username">Nombre de usuario</label>
                  <input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <button className="button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Validando..." : "Entrar al dashboard"}
                  {!isSubmitting && <i className="fa-solid fa-arrow-right" aria-hidden="true" />}
                </button>
                {message && <p className="form-message" role="alert">{message}</p>}
              </form>
              <button className="login-secondary-action" type="button" onClick={() => { setResetMode(true); setMessage(""); }}>
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : (
            <form className="form-stack" onSubmit={resetCodeSent ? confirmPasswordReset : requestPasswordReset}>
              <div className="field">
                <label htmlFor="reset-email">Correo verificado</label>
                <input id="reset-email" type="email" autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required maxLength={254} />
              </div>
              {resetCodeSent && (
                <>
                  <div className="field">
                    <label htmlFor="reset-code">Código de ocho dígitos</label>
                    <input id="reset-code" inputMode="numeric" autoComplete="one-time-code" value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 8))} required />
                  </div>
                  <div className="field">
                    <label htmlFor="reset-new-password">Nueva contraseña</label>
                    <input id="reset-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} required />
                    <span className="helper-text">Usa entre 12 y 128 caracteres.</span>
                  </div>
                </>
              )}
              <button className="button-primary" type="submit" disabled={resetBusy}>
                {resetBusy ? "Procesando..." : resetCodeSent ? "Restablecer contraseña" : "Enviar código"}
              </button>
              {message && <p className="form-message" role="status">{message}</p>}
              <button className="login-secondary-action" type="button" onClick={() => { setResetMode(false); setResetCodeSent(false); setMessage(""); }}>
                Volver al inicio de sesión
              </button>
            </form>
          )}
          {!resetMode && configuredProviders.length > 0 && (
            <div className="login-oauth">
              <div className="login-oauth-divider"><span>o continúa con</span></div>
              <div className="login-oauth-buttons">
                {oauthProviders.filter((provider) => configuredProviders.includes(provider.id)).map((provider) => (
                  <a
                    className="login-oauth-button"
                    href={`/api/admin/oauth/${provider.id}?action=login`}
                    key={provider.id}
                    aria-label={`Continuar con ${provider.label}`}
                    title={`Continuar con ${provider.label}`}
                  >
                    <i className={provider.icon} aria-hidden="true" />
                  </a>
                ))}
              </div>
              <p className="login-oauth-note">Disponible solo para cuentas del equipo previamente vinculadas.</p>
            </div>
          )}
          <nav className="login-policy-links" aria-label="Información legal">
            <a href="/terms">Términos de servicio</a>
            <a href="/privacy">Política de privacidad</a>
          </nav>
        </div>
      </section>
    </main>
  );
}
