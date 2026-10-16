"use client";

import { useEffect, useState } from "react";
import WorkspaceShell, { UserAvatar } from "./WorkspaceShell";
import { ROLE_LABELS } from "../../lib/panelAuth";

const socialFields = [
  { key: "github", label: "GitHub", icon: "fa-brands fa-github", placeholder: "https://github.com/usuario" },
  { key: "gitlab", label: "GitLab", icon: "fa-brands fa-gitlab", placeholder: "https://gitlab.com/usuario" },
  { key: "linkedin", label: "LinkedIn", icon: "fa-brands fa-linkedin", placeholder: "https://www.linkedin.com/in/usuario" },
  { key: "google", label: "Google", icon: "fa-brands fa-google", placeholder: "https://about.google/" },
  { key: "x", label: "X", icon: "fa-brands fa-twitter", placeholder: "https://x.com/usuario" },
];

function emptySocialLinks() {
  return Object.fromEntries(socialFields.map(({ key }) => [key, ""]));
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudo cargar el perfil.");
        setProfile({ ...data.user, socialLinks: { ...emptySocialLinks(), ...data.user.socialLinks } });
      })
      .catch((error) => setMessage(error.message));
  }, []);

  function setField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function setSocial(key, value) {
    setProfile((current) => ({ ...current, socialLinks: { ...current.socialLinks, [key]: value } }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo guardar el perfil.");
      setProfile(data.user);
      setMessage("Perfil actualizado.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
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
              <p>Actualiza tu información de contacto, tu biografía y los enlaces a tus redes.</p>
            </div>
          </section>
          <div className="profile-layout">
            <form className="panel-card profile-form" onSubmit={saveProfile}>
              <div className="field">
                <label htmlFor="profile-username">Nombre de usuario</label>
                <input id="profile-username" value={profile.username} onChange={(event) => setField("username", event.target.value)} required minLength={3} maxLength={32} />
              </div>
              <div className="field">
                <label htmlFor="profile-email">Correo electrónico</label>
                <input id="profile-email" type="email" value={profile.email} onChange={(event) => setField("email", event.target.value)} maxLength={254} />
              </div>
              <div className="field">
                <label htmlFor="profile-phone">Número de teléfono</label>
                <input id="profile-phone" type="tel" value={profile.phone} onChange={(event) => setField("phone", event.target.value)} maxLength={40} />
              </div>
              <div className="field">
                <label htmlFor="profile-avatar">Foto de perfil · URL HTTPS</label>
                <input id="profile-avatar" type="url" value={profile.avatarUrl} onChange={(event) => setField("avatarUrl", event.target.value)} placeholder="https://..." />
              </div>
              <div className="field">
                <label htmlFor="profile-bio">Biografía</label>
                <textarea id="profile-bio" value={profile.bio} onChange={(event) => setField("bio", event.target.value)} maxLength={500} />
                <span className="helper-text">{profile.bio.length}/500 caracteres</span>
              </div>
              <div className="section-heading" style={{ margin: ".25rem 0 0" }}>
                <h2>Redes sociales</h2>
              </div>
              <p className="helper-text">Agrega enlaces públicos a tus perfiles. Esto guarda URL, no autoriza aplicaciones ni almacena tokens OAuth.</p>
              {socialFields.map((social) => (
                <div className="social-row" key={social.key}>
                  <label className="social-name" htmlFor={`social-${social.key}`}>
                    <i className={social.icon} aria-hidden="true" />{social.label}
                  </label>
                  <input id={`social-${social.key}`} type="url" value={profile.socialLinks[social.key] || ""} onChange={(event) => setSocial(social.key, event.target.value)} placeholder={social.placeholder} />
                </div>
              ))}
              {message && <p className={`form-message${message === "Perfil actualizado." ? " success" : ""}`} role="status">{message}</p>}
              <button className="button-primary" type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
            <aside className="panel-card">
              <div className="profile-preview">
                <UserAvatar user={profile} />
                <div>
                  <h2>{profile.username}</h2>
                  <p>{ROLE_LABELS[user.role]}</p>
                </div>
              </div>
              <p className="profile-bio">{profile.bio || "Tu biografía aparecerá aquí."}</p>
              <div className="social-list">
                {socialFields.filter(({ key }) => profile.socialLinks[key]).map((social) => (
                  <a className="social-item" href={profile.socialLinks[social.key]} target="_blank" rel="noreferrer" key={social.key}>
                    <i className={social.icon} aria-hidden="true" />
                    <span>{social.label}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                  </a>
                ))}
                {socialFields.every(({ key }) => !profile.socialLinks[key]) && <span className="helper-text">Aún no agregas enlaces sociales.</span>}
              </div>
            </aside>
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
