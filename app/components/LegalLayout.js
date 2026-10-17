const LEGAL_LINKS = [
  { label: "Términos de servicio", href: "/terms", page: "terms" },
  { label: "Política de privacidad", href: "/privacy", page: "privacy" },
];

export default function LegalLayout({ title, description, currentPage, children }) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <a className="legal-brand" href="/" aria-label="Society . E X E, inicio">
            <span className="footer-brand-mark">. E X E</span>
            <span>Society . E X E</span>
          </a>
          <a className="legal-back" href="/">
            Volver al acceso
          </a>
        </div>
      </header>

      <div className="legal-main">
        <p className="eyebrow">Society . E X E · Workspace privado</p>
        <h1>{title}</h1>
        <p className="legal-description">{description}</p>
        <p className="legal-updated">Última actualización: 17 de octubre de 2026</p>

        <article className="legal-content">{children}</article>

        <footer className="legal-footer">
          <nav aria-label="Documentos legales">
            {LEGAL_LINKS.map(({ label, href, page }) => (
              <a
                key={page}
                href={href}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
          <a href="mailto:info@society-exe.site">Contacto</a>
        </footer>
      </div>
    </main>
  );
}
