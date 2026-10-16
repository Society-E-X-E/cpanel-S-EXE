"use client";

import { useCallback, useEffect, useState } from "react";
import WorkspaceShell, { UserAvatar } from "./WorkspaceShell";
import { ROLE_LABELS, ROLES, canChangeRole, canCreateRole, canDeleteUser, canManageUsers } from "../../lib/panelAuth";

function rolesFor(actorRole) {
  return ROLES.filter((role) => canCreateRole(actorRole, role));
}

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setForm({ username: "", email: "", password: "", role: rolesFor(actorRole)[0] || "" });
      await loadUsers();
      setMessage("Cuenta creada. Comparte la contraseña inicial por un canal seguro.");
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
                <p>Invita al equipo y asigna únicamente los roles permitidos por tu nivel de acceso.</p>
              </div>
            </section>
            {!canManage ? (
              <div className="panel-card empty-state">Tu rol no tiene acceso a la administración del equipo.</div>
            ) : (
              <div className="team-layout">
                <section className="panel-card">
                  <div className="section-heading" style={{ margin: "0 0 1rem" }}>
                    <h2>Miembros</h2>
                    <span>{users.length} cuentas</span>
                  </div>
                  {loading ? <p className="empty-state">Cargando equipo...</p> : (
                    <div className="team-list">
                      {users.map((member) => {
                        const changeableRoles = ROLES.filter((role) => canChangeRole(actor.role, member.role, role));
                        const removable = canDeleteUser(actor.role, member.role, actor.id === member.id);
                        return (
                          <article className="team-row" key={member.id}>
                            <div className="team-person">
                              <UserAvatar user={member} />
                              <div>
                                <strong>{member.username}</strong>
                                <span>{member.email || ROLE_LABELS[member.role]}</span>
                              </div>
                            </div>
                            {changeableRoles.length ? (
                              <select className="role-select" aria-label={`Rol de ${member.username}`} value={member.role} onChange={(event) => changeRole(member.id, event.target.value)}>
                                {changeableRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                              </select>
                            ) : <span className="role-select">{ROLE_LABELS[member.role]}</span>}
                            {removable && <button className="button-danger" type="button" onClick={() => removeUser(member.id)} aria-label={`Eliminar ${member.username}`}><i className="fa-regular fa-trash-can" aria-hidden="true" /></button>}
                          </article>
                        );
                      })}
                    </div>
                  )}
                  {message && <p className="form-message" role="status" style={{ marginTop: "1rem" }}>{message}</p>}
                </section>

                <form className="panel-card form-stack" onSubmit={(event) => createUser(event, actor.role)}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1rem" }}>Añadir miembro</h2>
                    <p className="helper-text" style={{ marginTop: ".45rem" }}>La contraseña temporal debe tener al menos 12 caracteres.</p>
                  </div>
                  <div className="field">
                    <label htmlFor="new-username">Nombre de usuario</label>
                    <input id="new-username" autoComplete="off" minLength={3} maxLength={32} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
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
                </form>
              </div>
            )}
          </>
        );
      }}
    </WorkspaceShell>
  );
}
