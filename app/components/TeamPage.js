"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WorkspaceShell, { UserAvatar } from "./WorkspaceShell";
import { ROLE_LABELS, ROLES, canChangeRole, canCreateRole, canDeleteUser, canManageUsers } from "../../lib/panelAuth";

function rolesFor(actorRole) {
  return ROLES.filter((role) => canCreateRole(actorRole, role));
}

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", firstName: "", lastName: "", email: "", password: "", role: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const memberModalRef = useRef(null);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "No se pudo cargar el equipo.");
    setUsers(data.users);
  }, []);

  useEffect(() => {
    loadUsers()
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedMember) return undefined;
    const previousFocus = document.activeElement;
    memberModalRef.current?.querySelector("button")?.focus();
    function handleModalKeys(event) {
      if (event.key === "Escape") setSelectedMember(null);
      if (event.key !== "Tab") return;
      const focusable = memberModalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleModalKeys);
    return () => {
      window.removeEventListener("keydown", handleModalKeys);
      previousFocus?.focus?.();
    };
  }, [selectedMember]);

  async function createUser(event, actorRole) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: form.role || rolesFor(actorRole)[0] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo crear la cuenta.");
      setForm({ username: "", firstName: "", lastName: "", email: "", password: "", role: rolesFor(actorRole)[0] || "" });
      await loadUsers();
      setMessage("Cuenta creada. La persona deberá cambiar la contraseña inicial al ingresar por primera vez.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id, role) {
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo actualizar el rol.");
      await loadUsers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeUser(id) {
    if (!window.confirm("¿Eliminar esta cuenta del equipo?")) return;
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo eliminar la cuenta.");
      await loadUsers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <WorkspaceShell>
      {(actor) => {
        const allowedRoles = rolesFor(actor.role);
        const canManage = canManageUsers(actor.role);
        return (
          <>
            <section className="page-heading">
              <div>
                <span className="eyebrow">Acceso y permisos</span>
                <h1>Equipo</h1>
                <p>Consulta los perfiles del equipo. La administración de cuentas y permisos depende de tu rol.</p>
              </div>
            </section>
            <div className={`team-layout${canManage ? "" : " team-directory-only"}`}>
                <section className="panel-card">
                  <div className="section-heading" style={{ margin: "0 0 1rem" }}>
                    <h2>Directorio del equipo</h2>
                    <span>{users.length} cuentas</span>
                  </div>
                  {loading ? <p className="empty-state">Cargando equipo...</p> : (
                    <div className="team-list">
                      {users.map((member) => {
                        const changeableRoles = ROLES.filter((role) => canChangeRole(actor.role, member.role, role));
                        const removable = canDeleteUser(actor.role, member.role, actor.id === member.id);
                        return (
                          <article className={`team-row${canManage ? "" : " team-row-viewer"}`} key={member.id}>
                            <button className="team-profile-trigger" type="button" onClick={() => setSelectedMember(member)} aria-haspopup="dialog">
                              <UserAvatar user={member} />
                              <span className="team-person">
                                <strong>{[member.firstName, member.lastName].filter(Boolean).join(" ") || member.username}</strong>
                                <span>{member.email || ROLE_LABELS[member.role]}</span>
                              </span>
                              <i className="fa-solid fa-arrow-up-right-from-square team-profile-icon" aria-hidden="true" />
                            </button>
                            {canManage && (changeableRoles.length ? (
                              <select className="role-select" aria-label={`Rol de ${member.username}`} value={member.role} onChange={(event) => changeRole(member.id, event.target.value)}>
                                {changeableRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                              </select>
                            ) : <span className="role-select">{ROLE_LABELS[member.role]}</span>)}
                            {canManage && removable && <button className="button-danger" type="button" onClick={() => removeUser(member.id)} aria-label={`Eliminar ${member.username}`}><i className="fa-regular fa-trash-can" aria-hidden="true" /></button>}
                          </article>
                        );
                      })}
                    </div>
                  )}
                  {message && <p className="form-message" role="status" style={{ marginTop: "1rem" }}>{message}</p>}
                </section>

                {canManage && <form className="panel-card form-stack" onSubmit={(event) => createUser(event, actor.role)}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1rem" }}>Añadir miembro</h2>
                    <p className="helper-text" style={{ marginTop: ".45rem" }}>La contraseña inicial debe tener al menos 12 caracteres y se cambiará al primer acceso.</p>
                  </div>
                  <div className="field">
                    <label htmlFor="new-username">Nombre de usuario</label>
                    <input id="new-username" autoComplete="off" minLength={3} maxLength={32} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
                  </div>
                  <div className="field">
                    <label htmlFor="new-first-name">Nombre</label>
                    <input id="new-first-name" maxLength={80} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="new-last-name">Apellido</label>
                    <input id="new-last-name" maxLength={80} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="new-email">Correo</label>
                    <input id="new-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="new-password">Contraseña inicial</label>
                    <input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
                  </div>
                  <div className="field">
                    <label htmlFor="new-role">Rol</label>
                    <select id="new-role" value={form.role || allowedRoles[0] || ""} onChange={(event) => setForm({ ...form, role: event.target.value })} required>
                      {allowedRoles.map((role) => <option value={role} key={role}>{ROLE_LABELS[role]}</option>)}
                    </select>
                  </div>
                  <p className="helper-text">
                    {actor.role === "admin" ? "Como administrador, solo puedes añadir moderadores." : "Owner y CEO pueden crear administradores o moderadores; solo Owner puede asignar el rol CEO."}
                  </p>
                  <button className="button-primary" type="submit" disabled={saving || !allowedRoles.length}>
                    {saving ? "Creando..." : "Crear cuenta"}
                  </button>
                </form>}
              </div>
            {selectedMember && (
              <div className="member-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMember(null); }}>
                <section ref={memberModalRef} className="member-modal panel-card" role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
                  <button className="member-modal-close" type="button" onClick={() => setSelectedMember(null)} aria-label="Cerrar perfil">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                  <div className="member-modal-heading">
                    <UserAvatar user={selectedMember} className="avatar member-modal-avatar" />
                    <div>
                      <span className="eyebrow">Perfil del equipo</span>
                      <h2 id="member-modal-title">{[selectedMember.firstName, selectedMember.lastName].filter(Boolean).join(" ") || selectedMember.username}</h2>
                      <p>{ROLE_LABELS[selectedMember.role]} · @{selectedMember.username}</p>
                    </div>
                  </div>
                  <dl className="member-modal-details">
                    <div><dt>Correo</dt><dd>{selectedMember.email || "No configurado"}</dd></div>
                    <div><dt>Número</dt><dd>{selectedMember.phone || "No configurado"}</dd></div>
                    <div><dt>Biografía</dt><dd>{selectedMember.bio || "Sin biografía"}</dd></div>
                    <div>
                      <dt>Auths conectados</dt>
                      <dd>
                        {selectedMember.connectedAuths?.length ? (
                          <ul className="member-auth-list">
                            {selectedMember.connectedAuths.map((auth) => (
                              <li key={auth.provider}>
                                <span><strong>{auth.provider}</strong>{auth.displayName || auth.username ? ` · ${auth.displayName || auth.username}` : ""}</span>
                                {auth.profileUrl && <a href={auth.profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir perfil ${auth.provider}`}><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>}
                              </li>
                            ))}
                          </ul>
                        ) : "Ninguna cuenta conectada"}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            )}
          </>
        );
      }}
    </WorkspaceShell>
  );
}
