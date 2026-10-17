"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "./WorkspaceShell";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo cambiar la contraseña.");
      setComplete(true);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell>
      {(user) => (
        <section className="password-change-card panel-card">
          <span className="eyebrow">Seguridad de la cuenta</span>
          <h1>{user.mustChangePassword ? "Crea tu contraseña privada" : "Cambiar contraseña"}</h1>
          <p>
            {user.mustChangePassword
              ? "Antes de usar el dashboard, reemplaza la contraseña inicial por una contraseña privada que no compartas."
              : "Confirma tu contraseña actual y establece una contraseña nueva."}
          </p>
          {!complete ? (
            <form className="form-stack" onSubmit={submit}>
              <div className="field">
                <label htmlFor="current-password">Contraseña actual</label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  maxLength={128}
                />
              </div>
              <div className="field">
                <label htmlFor="new-password">Nueva contraseña</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                <span className="helper-text">Usa entre 12 y 128 caracteres y no la reutilices en otros servicios.</span>
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Confirma la nueva contraseña</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <button className="button-primary" type="submit" disabled={saving}>
                {saving ? "Actualizando..." : "Guardar contraseña nueva"}
              </button>
            </form>
          ) : (
            <button className="button-primary" type="button" onClick={() => router.replace("/")}>
              Ir al inicio de sesión
            </button>
          )}
          {message && <p className={`form-message${complete ? " success" : ""}`} role="status">{message}</p>}
        </section>
      )}
    </WorkspaceShell>
  );
}
