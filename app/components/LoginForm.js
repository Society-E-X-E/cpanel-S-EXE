"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    for (const key of ["svpSubmissions", "svpLastSubmission", "svpFlow"]) {
      localStorage.removeItem(key);
    }
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
      router.replace("/dashboard");
    } catch (error) {
      console.error("Login request failed:", error);
      setMessage("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
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
        <span className="login-legal">Acceso exclusivo para miembros autorizados.</span>
      </section>

      <section className="login-panel-wrap">
        <div className="login-panel">
          <div className="brand-lockup" style={{ marginBottom: "2.2rem" }}>
            <span className="brand-mark">.EXE</span>
            <span className="brand-name">Society . E X E</span>
          </div>
          <span className="eyebrow">Bienvenido de nuevo</span>
          <h2 style={{ marginTop: ".55rem" }}>Inicia sesión</h2>
          <p>Usa la cuenta del equipo que te asignaron para continuar.</p>
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
        </div>
      </section>
    </main>
  );
}
