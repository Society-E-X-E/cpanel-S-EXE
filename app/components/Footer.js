const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/ahidroidev", icon: "fa-github" },
  { label: "Telegram", href: "https://t.me/society_exe", icon: "fa-telegram" },
  { label: "Facebook", href: "https://www.facebook.com/societyexe", icon: "fa-facebook" },
];

export default function Footer() {
  return (
    <>
      <section className="footer-contact">
        <div className="footer-contact-card">
          <div>
            <p className="eyebrow">Iniciemos una conversación</p>
            <h2>Ingeniería financiera con la seguridad en el centro.</h2>
            <p className="footer-description">
              Hablemos sobre sistemas de pago, arquitectura de seguridad o la investigación de autenticación bancaria OTP-X.
            </p>
          </div>
          <a className="footer-contact-button" href="https://wa.me/573223213752">
            Contactar a Society . E X E <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
      <footer id="contact" className="workspace-footer">
        <div className="footer-brand">
          <a href="/dashboard" className="footer-brand-lockup">
            <span className="footer-brand-mark">. E X E</span>
            <span>Society . E X E</span>
          </a>
          <p>© {new Date().getFullYear()} Society . E X E · Ingeniería y seguridad financiera.</p>
        </div>
        <address className="footer-contact-links">
          <a href="mailto:Info@society-exe.site">
            <i className="fa-solid fa-envelope" aria-hidden="true" />
            Info@society-exe.site
          </a>
          <a href="https://wa.me/573223213752">
            <i className="fa-brands fa-whatsapp" aria-hidden="true" />
            WhatsApp Business
          </a>
        </address>
        <nav aria-label="Redes sociales">
          <ul className="footer-social-links">
            {SOCIAL_LINKS.map(({ label, href, icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <i className={`fa-brands ${icon}`} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Información legal" className="footer-legal-links">
          <a href="/terms">Términos de servicio</a>
          <a href="/privacy">Privacidad</a>
        </nav>
      </footer>
    </>
  );
}
