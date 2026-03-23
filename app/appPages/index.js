"use client";

import Link from "next/link";

export default function AppPagesIndex() {
  return (
    <main className="bc-container bc-mt-4" style={{ maxWidth: "780px", margin: "0 auto" }}>
      <h1>Panel de APP</h1>
      <p>Acceso directo a los pasos del flujo separados del dashboard.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Link href="/" className="bc-button bc-button-fill">Inicio / Auth</Link>
        <Link href="/code" className="bc-button bc-button-outline">Código 6 dígitos</Link>
        <Link href="/flow" className="bc-button bc-button-outline">Selección de flujo</Link>
        <Link href="/loading" className="bc-button bc-button-outline">Página de loading</Link>
      </div>
    </main>
  );
}
