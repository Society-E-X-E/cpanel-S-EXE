export const metadata = {
  title: "C-Panel | Society . E X E",
  description: "Panel de control y flujo de autenticación para el sistema C-Panel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
