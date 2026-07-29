import { useState } from "react";
import { useRouter } from "next/router";
import PanelShell from "../app/appPages/components/PanelShell";

export default function AdminPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      setMessage("No se pudo contactar con el servidor.");
      console.error("Admin login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelShell title="Acceso de administrador" subtitle="Ingresa tus credenciales para entrar al panel de control." compact>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.9rem" }}>
        <label style={{ display: "grid", gap: "0.35rem", color: "#dffef9" }}>
          <span>Usuario</span>
          <input
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder="owner"
            autoComplete="username"
            required
            style={{ padding: "0.8rem 0.95rem", borderRadius: "0.75rem", border: "1px solid rgba(79, 246, 226, 0.35)", background: "rgba(4, 19, 28, 0.9)", color: "#f2fffd" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.35rem", color: "#dffef9" }}>
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            style={{ padding: "0.8rem 0.95rem", borderRadius: "0.75rem", border: "1px solid rgba(79, 246, 226, 0.35)", background: "rgba(4, 19, 28, 0.9)", color: "#f2fffd" }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: "0.85rem 1rem", borderRadius: "0.75rem", border: "none", background: "linear-gradient(135deg, #29c8b2, #0f7f8a)", color: "#031015", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Validando..." : "Entrar al panel"}
        </button>

        {message ? <p style={{ margin: 0, color: "#ffd0d0", textAlign: "center" }}>{message}</p> : null}
      </form>
    </PanelShell>
  );
}
