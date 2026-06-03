"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "../appPages/components/Footer";
import { adminFetch } from "../../lib/apiClient";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Verificación de sesión inicial optimizada
  useEffect(() => {
    let isMounted = true;
    adminFetch("/api/admin/me")
      .then(({ response }) => {
        if (response.ok && isMounted) router.push("/dashboard");
      });
    return () => { isMounted = false; };
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { response, data } = await adminFetch("/api/admin/login", {
        method: "POST",
        body: { username, password },
      });

      if (response.ok && data.status === "ok") {
        router.push("/dashboard");
      } else {
        setError(data?.message || "Error de autenticación.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <main style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left, #002732, #000000 45%)",
        color: "#b5fff5",
        padding: "2rem"
      }}>
        <section style={{
        maxWidth: "520px",
        margin: "0 auto",
        padding: "2rem",
        borderRadius: "1rem",
        background: "linear-gradient(145deg, rgba(42, 59, 69, 0.9), rgba(8, 19, 28, 0.85))",
        boxShadow: "0 0 30px rgba(0, 255, 255, 0.25)"
      }}>
        <div style={{
          textAlign: "center",
          marginBottom: "2rem",
          fontFamily: "monospace",
          letterSpacing: "0.5rem",
          fontSize: "2rem",
          color: "#4ff6e2",
          textShadow: "0 0 16px rgba(79, 246, 226, 0.7)"
        }}>
          . E X E
        </div>

        <h2 style={{ margin: "0 0 2rem",textAlign: "center", color: "#d4fffd" }}>C-Panel </h2>
        <p style={{ marginBottom: "1.5rem", color: "#c5f3f1" }}> Verify for access:</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <div className="bc-form-field" style={{ color: "#d4fffd" }}>
            <input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bc-input"
              autoComplete="username"
              required
              placeholder="@devcrackpy "
              style={{padding:" 1.9rem 0.75rem 0.5rem"}}
            />
            <label htmlFor="admin-username" className="bc-label">Usuario</label>
          </div>
          <div className="bc-form-field" style={{ color: "#d4fffd" }}>
            <input
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="bc-input"
              autoComplete="current-password"
              required
              placeholder="********"
              style={{padding:" 1.9rem 0.75rem 0.5rem"}}
            />
            <label htmlFor="admin-password" className="bc-label">Contraseña</label>
          </div>

          <button type="submit" className="bc-button bc-button-primary" disabled={isLoading}>
      {isLoading ? "Verificando..." : "Access"}
    </button>
          {error && <p className="bc-text-danger" style={{ margin: 0 }}>{error}</p>}
        </form>

        <style jsx>{`
          .bc-form-field {
            position: relative;
          }

          .bc-form-field .bc-input {
            width: 100%;
            padding: 1rem 0.75rem 0.5rem;
            background: rgba(0, 0, 0, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 0.9rem;
            color: #0b9494;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }

          .bc-form-field .bc-input:focus {
            outline: none;
            border-color: #4ff6e2;
            box-shadow: 0 0 0 0.15rem rgba(79, 246, 226, 0.25);
          }

          .bc-form-field .bc-label {
            position: absolute;
            left: 0.75rem;
            top: -2rem;
            color: rgba(229, 245, 246, 0.8);
            font-size: 0.85rem;
            pointer-events: none;
            transform-origin: left top;
            transition: transform 0.2s ease, color 0.2s ease, font-size 0.2s ease;
            transform: translateY(0) scale(1);
            background: hsla(0, 0%, 100%, 0.00);
            padding: 0 0.2rem;
          }

          .bc-form-field .bc-input:focus + .bc-label,
          .bc-form-field .bc-input:not(:placeholder-shown) + .bc-label {
            transform: translateY(-0.6rem) scale(0.85);
            color: #4ff6e2;
            font-size: 0.78rem;
          }
        `}</style>

        <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#a5dbd7" }}>
          Si ingresas credenciales inválidas, se bloquerá el acceso al C-Panel.
        </div>
      </section>

      <Footer />
    </main>
  </>);
}
