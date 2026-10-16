"use client";

import WorkspaceShell from "./WorkspaceShell";

const metrics = [
  { label: "Visitas del sitio", icon: "fa-solid fa-arrow-trend-up" },
  { label: "Visitantes únicos", icon: "fa-regular fa-eye" },
  { label: "Sesiones activas", icon: "fa-solid fa-wave-square" },
  { label: "Disponibilidad", icon: "fa-solid fa-heart-pulse" },
];

export default function DashboardPage() {
  return (
    <WorkspaceShell>
      {(user) => (
        <>
          <section className="page-heading">
            <div>
              <span className="eyebrow">Vista general</span>
              <h1>Hola, {user.username}</h1>
              <p>El estado de Society . E X E y sus proyectos en un solo lugar.</p>
            </div>
          </section>

          <div className="metric-grid" aria-label="Analítica del sitio">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <div className="metric-top">
                  <span>{metric.label}</span>
                  <span className="metric-icon"><i className={metric.icon} aria-hidden="true" /></span>
                </div>
                <div className="metric-value">—</div>
                <span className="metric-note">Fuente de analítica sin conectar</span>
              </article>
            ))}
          </div>

          <section style={{ marginTop: "1rem" }}>
            <div className="integration-banner">
              <div className="integration-copy">
                <i className="fa-solid fa-chart-line" aria-hidden="true" />
                <div>
                  <strong>Conecta una fuente autorizada de analítica</strong>
                  <span>Las métricas aparecerán cuando se configure el proveedor. No se registran credenciales ni datos personales de visitantes.</span>
                </div>
              </div>
              <span className="status-pill">Pendiente</span>
            </div>
          </section>

          <section>
            <div className="section-heading">
              <h2>Proyectos</h2>
              <span>2 espacios</span>
            </div>
            <div className="project-grid">
              <article className="project-card">
                <div className="project-head">
                  <span className="project-logo">.EXE</span>
                  <span className="status-pill">Analítica sin conectar</span>
                </div>
                <h3>Society . E X E</h3>
                <p>Sitio principal de la organización y su presencia pública.</p>
                <div className="project-foot">
                  <a href="https://society-exe.site" target="_blank" rel="noreferrer">society-exe.site</a>
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                </div>
              </article>
              <article className="project-card">
                <div className="project-head">
                  <span className="project-logo">OTP</span>
                  <span className="status-pill">Sin métricas conectadas</span>
                </div>
                <h3>OTP-X</h3>
                <p>Espacio de seguimiento del proyecto; solo se mostrarán datos autorizados y no confidenciales.</p>
                <div className="project-foot">
                  <span>Proyecto interno</span>
                  <i className="fa-solid fa-lock" aria-hidden="true" />
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </WorkspaceShell>
  );
}
