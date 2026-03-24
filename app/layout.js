import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Bancolombia Sucursal Virtual Personas",
  description: "Banca virtual de Bancolombia para personas naturales. Consulta tu saldo, movimientos, paga tus servicios y más.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO" style={{ fontSize: "1rem" }}>
      <head>
        <link rel="icon" type="image/x-icon" href="/assets/icon/favicon.ico" />
        <link
          id="cursorThemeCSS"
          rel="stylesheet"
          href="/assets/css/small-cursor-dark.css"
        />
        <link
          rel="stylesheet"
          href="/assets/css/mouse-focus.css"
          media="all"
        />
        <link
          id="svpThemeCSS"
          rel="stylesheet"
          href="/assets/css/bds.min.css"
          media="all"
        />
        <link
          id="svp-bds-theme"
          rel="stylesheet"
          href="/assets/css/bds-black.min.css"
        />
        <style>{`html, body { font-synthesis: none; }`}</style>
      </head>
      <body className="bc-bg-brand-N-P-pair-50-00" id="body">
        <Script src="/assets/js/detect.js" strategy="lazyOnload" />
        <Script src="/assets/js/bootstrap.js" strategy="lazyOnload" />
        
        {children}
      </body>
    </html>
  );
}
