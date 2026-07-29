export default function PanelCard({ title, children, actions = null }) {
  const cardStyles = `
    .panel-card {
      border: 1px solid rgba(90, 243, 228, 0.22);
      border-radius: 1rem;
      background: rgba(4, 21, 31, 0.8);
      padding: 1rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    }

    .panel-card__title {
      margin: 0 0 0.75rem;
      color: #dffef9;
      font-size: 1.05rem;
    }

    .panel-card__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .panel-card__body {
      display: grid;
      gap: 0.75rem;
    }
  `;

  return (
    <section className="panel-card">
      {title ? <h2 className="panel-card__title">{title}</h2> : null}
      {actions ? <div className="panel-card__actions">{actions}</div> : null}
      <div className="panel-card__body">{children}</div>

      <style>{cardStyles}</style>
    </section>
  );
}
