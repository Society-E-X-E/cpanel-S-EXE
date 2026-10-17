"use client";

import { useCallback, useEffect, useState } from "react";
import WorkspaceShell, { UserAvatar } from "./WorkspaceShell";
import { oauthProviderErrorMessage } from "./oauthMessages";
import { ROLE_LABELS } from "../../lib/panelAuth";

const socialProviders = [
  { id: "github", label: "GitHub", icon: "fa-brands fa-github" },
  { id: "gitlab", label: "GitLab", icon: "fa-brands fa-gitlab" },
  { id: "google", label: "Google", icon: "fa-brands fa-google" },
];

function oauthMessage() {
  const url = new URL(window.location.href);
  const status = url.searchParams.get("oauth");
  const providerId = url.searchParams.get("provider");
  const reason = url.searchParams.get("reason");
  const provider = socialProviders.find((item) => item.id === providerId);
  window.history.replaceState({}, "", `${url.pathname}${url.hash}`);
  if (status === "connected" && provider) return `${provider.label} se conectó correctamente.`;
  if (status === "conflict" && provider) return `Esta cuenta de ${provider.label} ya está conectada a otro usuario del equipo.`;
  if (status === "provider-error" && provider) {
    return oauthProviderErrorMessage(provider.id, provider.label, reason);
  }
  if (status === "error" && provider) return `No se pudo conectar ${provider.label}. Revisa la autorización e inténtalo de nuevo.`;
  return "";
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [draftProfile, setDraftProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [providers, setProviders] = useState([]);
  const [connections, setConnections] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpBusy, setEmailOtpBusy] = useState(false);

  const loadSocialAccounts = useCallback(async () => {
    const response = await fetch("/api/admin/oauth/github?action=status");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "No se pudo cargar el estado de las conexiones.");
    setProviders(data.providers);
    setConnections(data.connections);
  }, []);

  useEffect(() => {
    setMessage(oauthMessage());
    Promise.all([
      fetch("/api/admin/profile").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudo cargar el perfil.");
        setProfile(data.user);
      }),
      loadSocialAccounts(),
    ]).catch((error) => setMessage(error.message));
  }, [loadSocialAccounts]);

  function setField(field, value) {
    setDraftProfile((current) => ({ ...current, [field]: value }));
  }

  function startEditing() {
    setDraftProfile({ ...profile });
    setEditing(true);
    setMessage("");
  }

  function cancelEditing() {
    setDraftProfile(null);
    setEditing(false);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: draftProfile.username,
          firstName: draftProfile.firstName,
          lastName: draftProfile.lastName,
          email: draftProfile.email,
          phone: draftProfile.phone,
          bio: draftProfile.bio,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo guardar el perfil.");
      if (profile.email?.toLowerCase() !== data.user.email?.toLowerCase()) {
        setEmailOtp("");
        setEmailOtpSent(false);
      }
      setProfile((current) => ({ ...current, ...data.user }));
      setDraftProfile(null);
      setEditing(false);
      setMessage("Perfil actualizado.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestEmailVerification() {
    setEmailOtpBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo enviar el código.");
      setEmailOtpSent(true);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setEmailOtpBusy(false);
    }
  }

  async function verifyEmail() {
    setEmailOtpBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: emailOtp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo verificar el correo.");
      setProfile((current) => ({ ...current, emailVerifiedAt: new Date().toISOString() }));
      setEmailOtp("");
      setEmailOtpSent(false);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setEmailOtpBusy(false);
    }
  }

  async function disconnect(provider) {
    setDisconnecting(provider);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/oauth/${provider}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo quitar la conexión.");
      await loadSocialAccounts();
      if (provider === "google") setProfile((current) => ({ ...current, avatarUrl: "" }));
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDisconnecting("");
    }
  }

  return (
    <WorkspaceShell>
      {(user) => !profile ? (
        <p className="empty-state">{message || "Cargando perfil..."}</p>
      ) : (
        <>
          <section className="page-heading">
            <div>
              <span className="eyebrow">Cuenta personal</span>
              <h1>Mi perfil</h1>
              <p>Actualiza tu información y conecta las cuentas sociales que quieras vincular.</p>
            </div>
          </section>
          {message && <p className={`form-message profile-message${message.includes("actualizad") || message.includes("eliminad") || message.includes("conectó") || message.includes("Perfil") ? " success" : ""}`} role="status">{message}</p>}
          <div className="profile-layout">
            <aside className="profile-sidebar">
              <section className="panel-card profile-summary">
                <div className="profile-preview">
                  <UserAvatar user={profile} />
                  <div>
                    <h2>{profile.username}</h2>
                    <p>{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
                <p className="profile-bio">{profile.bio || "Tu biografía aparecerá aquí."}</p>
                <div className="profile-contact">
                  <span><i className="fa-regular fa-envelope" aria-hidden="true" />{profile.email || "Correo sin configurar"}</span>
                  <span><i className="fa-solid fa-phone" aria-hidden="true" />{profile.phone || "Teléfono sin configurar"}</span>
                </div>
                <div className="section-heading connection-heading">
                  <h2>Cuentas conectadas</h2>
                </div>
                <div className="connection-list">
                  {socialProviders.map((provider) => {
                  const connection = connections[provider.id];
                  const isConfigured = providers.some((item) => item.id === provider.id && item.configured);
                  return (
                    <div className="connection-item" key={provider.id}>
                      <div className="connection-provider">
                        <span className="social-icon"><i className={provider.icon} aria-hidden="true" /></span>
                        <div>
                          <strong>{provider.label}</strong>
                          <span>{connection ? (connection.displayName || connection.username || "Conectada") : (isConfigured ? "No conectada" : "Pendiente de configuración")}</span>
                        </div>
                      </div>
                      {connection ? (
                        <div className="connection-actions">
                          {connection.profileUrl && <a className="connection-link" href={connection.profileUrl} target="_blank" rel="noreferrer" aria-label={`Ver perfil de ${provider.label}`}><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>}
                          <button className="button-secondary connection-button" type="button" onClick={() => disconnect(provider.id)} disabled={disconnecting === provider.id}>
                            {disconnecting === provider.id ? "..." : "Desconectar"}
                          </button>
                        </div>
                      ) : (
                        <a
                          className={`button-secondary connection-button${isConfigured ? "" : " is-disabled"}`}
                          href={isConfigured ? `/api/admin/oauth/${provider.id}` : undefined}
                          aria-disabled={!isConfigured}
                          onClick={(event) => { if (!isConfigured) event.preventDefault(); }}
                        >
                          Conectar
                        </a>
                      )}
                    </div>
                  );
                  })}
                </div>
                <p className="helper-text connection-note">Se solicita acceso de solo lectura a la identidad básica. Al desconectar se elimina el token cifrado del panel; para revocar el acceso del proveedor, hazlo también en los ajustes de sus aplicaciones autorizadas.</p>
              </section>
            </aside>
            <section className="panel-card profile-details">
              <div className="profile-details-heading">
                <div>
                  <span className="eyebrow">Información personal</span>
                  <h2>{editing ? "Editar perfil" : "Detalles de la cuenta"}</h2>
                </div>
                {!editing && (
                  <div className="profile-heading-actions">
                    <a className="button-secondary profile-edit-button" href="/change-password">
                      <i className="fa-solid fa-key" aria-hidden="true" />
                      Cambiar contraseña
                    </a>
                    <button className="button-secondary profile-edit-button" type="button" onClick={startEditing}>
                      <i className="fa-solid fa-pen" aria-hidden="true" />
                      Editar perfil
                    </button>
                  </div>
                )}
              </div>
              {editing ? (
                <form className="profile-form" onSubmit={saveProfile}>
                  <div className="field">
                    <label htmlFor="profile-username">Nombre de usuario</label>
                    <input id="profile-username" value={draftProfile.username || ""} onChange={(event) => setField("username", event.target.value)} required minLength={3} maxLength={32} />
                  </div>
                  <div className="field">
                    <label htmlFor="profile-first-name">Nombre</label>
                    <input id="profile-first-name" value={draftProfile.firstName || ""} onChange={(event) => setField("firstName", event.target.value)} maxLength={80} />
                  </div>
                  <div className="field">
                    <label htmlFor="profile-last-name">Apellido</label>
                    <input id="profile-last-name" value={draftProfile.lastName || ""} onChange={(event) => setField("lastName", event.target.value)} maxLength={80} />
                  </div>
                  <div className="field">
                    <label htmlFor="profile-email">Correo electrónico</label>
                    <input id="profile-email" type="email" value={draftProfile.email || ""} onChange={(event) => setField("email", event.target.value)} maxLength={254} />
                    <span className="helper-text">Cambiar el correo elimina su verificación actual; vuelve a verificarlo para usarlo en recuperación.</span>
                  </div>
                  <div className="field">
                    <label htmlFor="profile-phone">Número de teléfono</label>
                    <input id="profile-phone" type="tel" value={draftProfile.phone || ""} onChange={(event) => setField("phone", event.target.value)} maxLength={40} />
                  </div>
                  <div className="field">
                    <label>Foto de perfil</label>
                    <div className="profile-photo-source">
                      <UserAvatar user={profile} />
                      <span className="helper-text">
                        {profile.avatarUrl
                          ? "Se muestra la foto de tu cuenta Google conectada."
                          : "Conecta Google para usar su foto de perfil. Si no hay foto disponible, se mostrarán tus iniciales."}
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="profile-bio">Biografía</label>
                    <textarea id="profile-bio" value={draftProfile.bio || ""} onChange={(event) => setField("bio", event.target.value)} maxLength={500} />
                    <span className="helper-text">{(draftProfile.bio || "").length}/500 caracteres</span>
                  </div>
                  <div className="profile-form-actions">
                    <button className="button-secondary profile-cancel-button" type="button" onClick={cancelEditing} disabled={saving}>Cancelar</button>
                    <button className="button-primary profile-save-button" type="submit" disabled={saving}>
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="profile-details-list">
                  <div><dt>Nombre de usuario</dt><dd>{profile.username}</dd></div>
                  <div><dt>Nombre</dt><dd>{profile.firstName || "No configurado"}</dd></div>
                  <div><dt>Apellido</dt><dd>{profile.lastName || "No configurado"}</dd></div>
                  <div><dt>Correo electrónico</dt><dd>{profile.email || "No configurado"}</dd></div>
                  <div><dt>Verificación del correo</dt><dd>{profile.emailVerifiedAt ? "Verificado" : "Pendiente"}</dd></div>
                  <div><dt>Número de teléfono</dt><dd>{profile.phone || "No configurado"}</dd></div>
                  <div><dt>Biografía</dt><dd>{profile.bio || "Aún no has añadido una biografía."}</dd></div>
                  <div><dt>Foto de perfil</dt><dd>{profile.avatarUrl ? "Sincronizada con Google" : "Iniciales de usuario"}</dd></div>
                </dl>
              )}
            </section>
            {!profile.emailVerifiedAt && !editing && (
              <section className="panel-card email-verification-card">
                <div>
                  <h2>Verifica tu correo</h2>
                  <p className="helper-text">
                    {profile.email
                      ? `Enviaremos un código de un solo uso a ${profile.email}.`
                      : "Añade primero tu correo en Editar perfil."}
                  </p>
                </div>
                {!emailOtpSent ? (
                  <button className="button-secondary profile-edit-button" type="button" onClick={requestEmailVerification} disabled={emailOtpBusy || !profile.email}>
                    {emailOtpBusy ? "Enviando..." : "Enviar código"}
                  </button>
                ) : (
                  <div className="email-otp-entry">
                    <input aria-label="Código de verificación" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={emailOtp} onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} />
                    <button className="button-secondary profile-edit-button" type="button" onClick={verifyEmail} disabled={emailOtpBusy || emailOtp.length !== 8}>
                      {emailOtpBusy ? "Verificando..." : "Verificar"}
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
