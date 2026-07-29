export default function PanelShell({
  title,
  subtitle,
  children,
  footer = null,
  compact = false,
}) {
  return (
    <main className="panel-shell">
      <section className={`panel-shell__card ${compact ? "panel-shell__card--compact" : ""}`}>
        <div className="panel-shell__brand" aria-label="C-Panel">
          <div className="panel-shell__brand-mark">. E X E</div>
          <div className="panel-shell__brand-title">C-Panel</div>
        </div>

        {title ? <h1 className="panel-shell__title">{title}</h1> : null}
        {subtitle ? <p className="panel-shell__subtitle">{subtitle}</p> : null}

        <div className="panel-shell__content">{children}</div>
      </section>

      {footer}

      <style jsx global>{`
        .panel-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: radial-gradient(circle at top left, #123742 0%, #07181d 55%, #02090c 100%);
          color: #f2fffd;
        }

        .panel-shell__card {
          width: min(100%, 760px);
          padding: 2rem;
          border-radius: 1.25rem;
          background: linear-gradient(145deg, rgba(17, 46, 56, 0.95), rgba(4, 20, 31, 0.95));
          border: 1px solid rgba(90, 243, 228, 0.22);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        }

        .panel-shell__card--compact {
          width: min(100%, 520px);
          padding: 1.75rem;
        }

        .panel-shell__brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          margin-bottom: 1.25rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          letter-spacing: 0.22rem;
          text-transform: uppercase;
        }

        .panel-shell__brand-mark {
          color: #4ff6e2;
          font-size: 1.2rem;
          font-weight: 700;
          text-shadow: 0 0 16px rgba(79, 246, 226, 0.35);
        }

        .panel-shell__brand-title {
          color: #d9fff9;
          font-size: 0.95rem;
          opacity: 0.9;
        }

        .panel-shell__title {
          margin: 0 0 0.35rem;
          font-size: 1.7rem;
          font-weight: 700;
          text-align: center;
          color: #ffffff;
        }

        .panel-shell__subtitle {
          margin: 0 0 1.35rem;
          text-align: center;
          color: #a9f3eb;
          line-height: 1.55;
        }

        .panel-shell__content {
          display: grid;
          gap: 1rem;
        }
      `}</style>
    </main>
  );
}
