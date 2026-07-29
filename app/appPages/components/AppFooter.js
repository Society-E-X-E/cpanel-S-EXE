"use client";

import { useEffect, useState } from "react";

export default function AppFooter() {
  const [dateTime, setDateTime] = useState("Cargando información...");
  const [ipAddress, setIpAddress] = useState("Cargando...");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const formatted = now.toLocaleString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setDateTime(formatted);
    };

    update();
    const interval = setInterval(update, 60_000);

    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ip) setIpAddress(data.ip);
      })
      .catch(() => {
        // usar valor por defecto en caso de fallo
      });

    return () => clearInterval(interval);
  }, []);

  return (
    <svp-footer>
      <bc-footer componentid="svp-footer">
        <div className="bc-footer app-footer" id="svp-footer">
          <div className="bc-container bc-pb-4 app-footer-container">
            <div className="bc-footer-top-links app-footer-top-links">
              <div className="bc-footer-top-links-ca">
                <a href="https://www.bancolombia.com/centro-de-ayuda/canales/sucursal-virtual-personas" target="_blank" rel="noopener noreferrer" className="bc-link link-default app-footer-link">¿Problemas para conectarte?</a>
              </div>
              <span className="bc-footer-separator app-footer-separator" aria-hidden="true">·</span>
              <div className="bc-footer-top-links-ca">
                <a href="https://www.bancolombia.com/educacion-financiera/seguridad-bancaria/seguridad-informatica?utm_source=Organic&utm_medium=Redirect&utm_campaign=Htaccess-Momentaneas-de-migrasion-corporativa" target="_blank" rel="noopener noreferrer" className="bc-link link-default app-footer-link">Aprende sobre seguridad</a>
              </div>
              <span className="bc-footer-separator app-footer-separator" aria-hidden="true">·</span>
              <div className="bc-footer-top-links-ca">
                <a href="https://www.bancolombia.com/wcm/connect/1dcd5b4b-a856-4cee-9df9-f497eb26f964/Reglamento+Banca+por+Internet.pdf?MOD=AJPERES&utm_medium=Redirect&utm_source=Organic&utm_campaign=Htaccess-9-personas" target="_blank" rel="noopener noreferrer" className="bc-link link-default app-footer-link">Reglamento Sucursal Virtual</a>
              </div>
              <span className="bc-footer-separator app-footer-separator" aria-hidden="true">·</span>
              <div className="bc-footer-top-links-ca">
                <a href="https://www.bancolombia.com/personas/documentos-legales/proteccion-datos/bancolombia-sa" target="_blank" rel="noopener noreferrer" className="bc-link link-default app-footer-link">Política de privacidad</a>
              </div>
            </div>

            <div className="bc-footer-divisor app-footer-division" />

            <div className="bc-footer-bottom app-footer-bottom">
              <div className="bc-footer-bottom-left app-footer-bottom-left">
                <div className="bc-footer-bottom-left-side app-footer-bottom-left-side">
                  <div className="bc-footer-bottom-top-icon">
                    <img src="https://library-sdb.apps.bancolombia.com/bds/9.41.1/assets/icons/logos/bancolombia-horizontal-no-spacing.svg" alt="logo" className="app-footer-logo" />
                  </div>
                  <div className="bc-footer-bottom-left-side-vigilant">
                    <img src="https://library-sdb.apps.bancolombia.com/bds/9.41.1/assets/icons/logos/logo-vigilado.svg" alt="Vigilado Superintendencia Financiera de Colombia" className="app-footer-vigilado" />
                  </div>
                </div>
              </div>

              <div className="bc-footer-bottom-right app-footer-bottom-right">
                <div className="bc-footer-bottom-right-text app-footer-bottom-right-text">
                  <p className="app-footer-info">Dirección IP: {ipAddress}</p>
                  <p className="app-footer-info">{dateTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </bc-footer>
    </svp-footer>
  );
}
