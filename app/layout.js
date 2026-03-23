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
        <link rel="icon" type="image/x-icon" href="/asset/icon/favicon.ico" />
        <link
          id="cursorThemeCSS"
          rel="stylesheet"
          href="/asset/css/small-cursor-dark.css"
        />
        <link
          rel="stylesheet"
          href="/asset/css/mouse-focus.css"
          media="all"
        />
        <link
          id="svpThemeCSS"
          rel="stylesheet"
          href="/asset/css/bds.min.css"
          media="all"
        />
        <link
          id="svp-bds-theme"
          rel="stylesheet"
          href="/asset/css/bds-black.min.css"
        />
        <style>{`html, body { font-synthesis: none; }`}</style>
      </head>
      <body className="bc-bg-brand-N-P-pair-50-00" id="body">
        <Script src="/asset/js/detect.js" strategy="lazyOnload" />
        <Script src="/asset/js/bootstrap.js" strategy="lazyOnload" />
        
        {children}
      </body>
    </html>
  );
}
