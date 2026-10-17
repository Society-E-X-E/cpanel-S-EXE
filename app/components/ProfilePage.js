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
          email: draftProfile.email,
          phone: draftProfile.phone,
          bio: draftProfile.bio,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo guardar el perfil.");
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
                  <button className="button-secondary profile-edit-button" type="button" onClick={startEditing}>
                    <i className="fa-solid fa-pen" aria-hidden="true" />
                    Edit Profile
                  </button>
                )}
              </div>
              {editing ? (
                <form className="profile-form" onSubmit={saveProfile}>
                  <div className="field">
                    <label htmlFor="profile-username">Nombre de usuario</label>
                    <input id="profile-username" value={draftProfile.username || ""} onChange={(event) => setField("username", event.target.value)} required minLength={3} maxLength={32} />
                  </div>
                  <div className="field">
                    <label htmlFor="profile-email">Correo electrónico</label>
                    <input id="profile-email" type="email" value={draftProfile.email || ""} onChange={(event) => setField("email", event.target.value)} maxLength={254} />
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
                  <div><dt>Correo electrónico</dt><dd>{profile.email || "No configurado"}</dd></div>
                  <div><dt>Número de teléfono</dt><dd>{profile.phone || "No configurado"}</dd></div>
                  <div><dt>Biografía</dt><dd>{profile.bio || "Aún no has añadido una biografía."}</dd></div>
                  <div><dt>Foto de perfil</dt><dd>{profile.avatarUrl ? "Sincronizada con Google" : "Iniciales de usuario"}</dd></div>
                </dl>
              )}
            </section>
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
