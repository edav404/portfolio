"use client";

import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type ClippyState = "APPEARING" | "IDLE" | "WRITING" | "SEARCHING" | "CONFUSED";

export type ClippyOption = {
  label: string;
  onSelect: () => void;
};

type RetroClippyProps = {
  state?: ClippyState;
  children?: ReactNode;
  options?: ClippyOption[];
};

const stateCopy: Record<ClippyState, ReactNode> = {
  APPEARING: <>Iniciando ED Assistant...</>,
  IDLE: <>Parece que estás explorando el portafolio de Emmanuel. ¿Quieres que te ayude?</>,
  WRITING: <>Parece que estás escribiendo un mensaje. Incluye objetivo, alcance y fecha para recibir una respuesta más útil.</>,
  SEARCHING: <>Estoy buscando comandos disponibles. Escribe <kbd>HELP</kbd> para verlos todos.</>,
  CONFUSED: <>Hmm... no encuentro ese archivo. Podemos volver al escritorio o abrir los proyectos.</>,
};

export function RetroClippy({ state: forcedState, children, options = [] }: RetroClippyProps) {
  const [mounted, setMounted] = useState(false);
  const [appearing, setAppearing] = useState(true);
  const [formActive, setFormActive] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(true);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const activeState: ClippyState = appearing ? "APPEARING" : forcedState ?? (formActive ? "WRITING" : "IDLE");

  useEffect(() => {
    const mountTimer = window.setTimeout(() => setMounted(true), 0);
    const appearanceTimer = window.setTimeout(() => setAppearing(false), 1200);
    return () => { window.clearTimeout(mountTimer); window.clearTimeout(appearanceTimer); };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const hideTimer = window.setTimeout(() => setBubbleVisible(false), 0);
    const showTimer = window.setTimeout(() => setBubbleVisible(true), 400);
    return () => { window.clearTimeout(hideTimer); window.clearTimeout(showTimer); };
  }, [activeState, mounted]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => setFormActive(event.target instanceof HTMLElement && Boolean(event.target.closest("form")));
    const onFocusOut = () => window.setTimeout(() => setFormActive(document.activeElement instanceof HTMLElement && Boolean(document.activeElement.closest("form"))), 0);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => { document.removeEventListener("focusin", onFocusIn); document.removeEventListener("focusout", onFocusOut); };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="retro-clippy-portal" ref={constraintsRef}>
      {!assistantVisible ? <button className="retro-clippy-restore win-outset" type="button" onClick={() => { setAssistantVisible(true); setBubbleVisible(true); }} aria-label="Mostrar asistente ED">ED?</button> :
        <motion.aside className="retro-clippy" drag dragConstraints={constraintsRef} dragElastic={0} dragMomentum={false} aria-label="Asistente ED" data-state={activeState}>
          {bubbleVisible && <div className="retro-clippy-bubble" role="status" aria-live="polite">
            <button className="retro-clippy-close" type="button" onClick={() => setBubbleVisible(false)} aria-label="Cerrar mensaje del asistente">×</button>
            <div className="retro-clippy-copy">{children ?? stateCopy[activeState]}</div>
            {options.length > 0 && <div className="retro-clippy-actions">{options.map((option) => <button className="win-outset" type="button" key={option.label} onClick={option.onSelect}>{option.label}</button>)}</div>}
          </div>}
          <button className="retro-clippy-character" type="button" aria-label="Arrastrar asistente ED. Clic para mostrar ayuda." onClick={() => setBubbleVisible(true)}>
            <span className="retro-clippy-sprite" aria-hidden="true" key={activeState}/>
          </button>
          <button className="retro-clippy-hide win-outset" type="button" onClick={() => setAssistantVisible(false)} aria-label="Ocultar asistente ED">Ocultar</button>
        </motion.aside>}
    </div>,
    document.body,
  );
}
