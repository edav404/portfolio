"use client";

import { useEffect, useState } from "react";
import { DesktopShell } from "@/components/desktop/desktop-shell";
import { DesktopIcon, PixelLogo } from "@/components/desktop/desktop-icons";
import { StandardHome } from "@/components/standard-home";

type ViewMode = "choice" | "retro" | "standard";

function ExperienceGateway({ onChoose }: { onChoose: (view: Exclude<ViewMode, "choice">) => void }) {
  return <section className="experience-gateway" aria-labelledby="experience-title">
    <div className="experience-gateway-panel">
      <header><PixelLogo/><div><strong>EDAV</strong><span>PORTFOLIO EXPERIENCE SELECTOR</span></div></header>
      <p className="experience-gateway-kicker">SELECCIONA TU EXPERIENCIA</p>
      <h1 id="experience-title">¿Cómo quieres explorar el portafolio de Emmanuel?</h1>
      <p className="experience-gateway-intro">Puedes cambiar de vista en cualquier momento. El contenido y los proyectos son los mismos.</p>
      <div className="experience-gateway-options">
        <button type="button" onClick={() => onChoose("standard")} aria-describedby="standard-view-description">
          <span className="experience-gateway-icon is-standard"><DesktopIcon name="welcome"/></span>
          <span className="experience-gateway-recommended">Recomendada en móvil</span>
          <strong>Vista web normal</strong>
          <span id="standard-view-description">Navegación familiar, directa y cómoda para leer o recorrer desde cualquier dispositivo.</span>
          <b>Entrar a la vista web</b>
        </button>
        <button type="button" onClick={() => onChoose("retro")} aria-describedby="retro-view-description">
          <span className="experience-gateway-icon is-retro"><DesktopIcon name="terminal"/></span>
          <strong>EDAV Desktop 98</strong>
          <span id="retro-view-description">Escritorio interactivo con BIOS, ventanas, terminal, sonido y estética retro Y2K.</span>
          <b>Iniciar experiencia interactiva</b>
        </button>
      </div>
      <small>Ambas opciones respetan reducción de movimiento y permiten volver a cambiar de experiencia.</small>
    </div>
  </section>;
}

export function PortfolioExperience() {
  const [view, setView] = useState<ViewMode>("choice");
  const [skipRetroBoot, setSkipRetroBoot] = useState(false);

  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      const requestedView = new URLSearchParams(window.location.search).get("view");
      if (requestedView === "standard" || requestedView === "retro") setView(requestedView);
    }, 0);
    return () => window.clearTimeout(preferenceTimer);
  }, []);

  const changeView = (next: Exclude<ViewMode, "choice">) => {
    if (next === "standard") setSkipRetroBoot(true);
    setView(next);
    window.localStorage.setItem("edav-view", next);
    window.history.replaceState(null, "", next === "standard" ? "?view=standard" : window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (view === "choice") return <ExperienceGateway onChoose={changeView}/>;

  return view === "retro"
    ? <DesktopShell skipBoot={skipRetroBoot} onSwitchToStandard={() => changeView("standard")}/>
    : <StandardHome onReturnToRetro={() => changeView("retro")}/>;
}
