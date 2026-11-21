"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContactForm, type ContactFormCopy } from "@/components/contact-form";
import { MusicWidget, type MusicCopy } from "@/components/music-widget";
import { experienceSince } from "@/content/experience";
import { profile, technologies } from "@/content/profile";
import { caseStudies as projects, projectTitle } from "@/content/projects";
import { cvHref } from "@/content/site";
import { CrtOverlay } from "./crt-overlay";
import { DesktopIcon, type DesktopIconName, PixelLogo } from "./desktop-icons";
import { RetroClippy, type ClippyState } from "./RetroClippy";
import { ServicesWizard } from "./services-wizard";
import { TerminalApp } from "./terminal-app";

/** "Desarrollador Full Stack…" → "desarrollador Full Stack…" para usarlo dentro de una frase. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

type AppId = "welcome" | "projects" | "services" | "about" | "contact" | "media" | "terminal";
type WindowState = { id: AppId; open: boolean; minimized: boolean; maximized: boolean; z: number; x: number; y: number; width: number; height: number };

const appMeta: Record<AppId, { title: string; file: string; icon: DesktopIconName }> = {
  welcome: { title: "Bienvenido", file: "Bienvenido.exe", icon: "welcome" },
  projects: { title: "Mi trabajo", file: "Explorador de proyectos", icon: "folder" },
  services: { title: "Mis servicios", file: "Asistente de servicios", icon: "services" },
  about: { title: "Sobre Emmanuel", file: "About.txt", icon: "about" },
  contact: { title: "Contacto", file: "Nuevo mensaje", icon: "contact" },
  media: { title: "Reproductor", file: "Reproductor multimedia EDAV", icon: "music" },
  terminal: { title: "Símbolo del sistema", file: "C:\\EDAV", icon: "terminal" },
};

const initialWindows: WindowState[] = [
  { id: "welcome", open: true, minimized: false, maximized: false, z: 3, x: 235, y: 70, width: 720, height: 560 },
  { id: "media", open: true, minimized: false, maximized: false, z: 2, x: 805, y: 425, width: 390, height: 260 },
  { id: "terminal", open: false, minimized: false, maximized: false, z: 1, x: 430, y: 185, width: 650, height: 430 },
  { id: "projects", open: false, minimized: false, maximized: false, z: 1, x: 180, y: 80, width: 900, height: 620 },
  { id: "services", open: false, minimized: false, maximized: false, z: 1, x: 270, y: 95, width: 820, height: 590 },
  { id: "about", open: false, minimized: false, maximized: false, z: 1, x: 330, y: 100, width: 680, height: 520 },
  { id: "contact", open: false, minimized: false, maximized: false, z: 1, x: 370, y: 70, width: 650, height: 650 },
];

function BootScreen({ onFinish, onSwitchToStandard }: { onFinish: () => void; onSwitchToStandard?: () => void }) {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [soundStatus, setSoundStatus] = useState<"idle" | "on" | "unavailable">("idle");
  const [exiting, setExiting] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const completedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  const playTone = useCallback((frequency: number, delay: number, duration: number, volume = .035, type: OscillatorType = "square") => {
    const audio = audioRef.current;
    if (!audio || audio.state !== "running") return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }, []);

  const finishBoot = useCallback((immediate = false) => {
    if (completedRef.current) return;
    completedRef.current = true;
    playTone(196, 0, .08, .025);
    if (immediate) { onFinish(); return; }
    setExiting(true);
    playTone(392, .07, .12, .025, "sine");
    exitTimerRef.current = window.setTimeout(onFinish, 260);
  }, [onFinish, playTone]);

  const startBoot = useCallback(async () => {
    if (started || completedRef.current) return;
    setStarted(true);
    setPhase(1);
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) throw new Error("Web Audio no disponible");
      const audio = new AudioCtor();
      audioRef.current = audio;
      await audio.resume();
      setSoundStatus("on");
      playTone(110, 0, .11, .03);
      playTone(220, .12, .11, .03);
      playTone(440, .24, .18, .025, "sine");
    } catch {
      setSoundStatus("unavailable");
    }
  }, [playTone, started]);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const revealTimer = window.setTimeout(() => { setPhase(4); setProgress(100); }, 0);
      const reducedTimer = window.setTimeout(finishBoot, 650);
      return () => { window.clearTimeout(revealTimer); window.clearTimeout(reducedTimer); };
    }
    const startedAt = performance.now();
    const progressTimer = window.setInterval(() => setProgress(Math.min(100, ((performance.now() - startedAt) / 4500) * 100)), 45);
    const timers = [
      window.setTimeout(() => { setPhase(2); playTone(640, 0, .045, .018); }, 850),
      window.setTimeout(() => { setPhase(3); playTone(760, 0, .045, .018); }, 1650),
      window.setTimeout(() => { setPhase(4); playTone(261.63, 0, .32, .025, "sine"); playTone(329.63, .05, .32, .02, "sine"); playTone(392, .1, .42, .02, "sine"); }, 2700),
      window.setTimeout(finishBoot, 4700),
    ];
    return () => { window.clearInterval(progressTimer); timers.forEach(window.clearTimeout); };
  }, [finishBoot, playTone, started]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finishBoot(true); }
      if (!started && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); void startBoot(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finishBoot, startBoot, started]);

  useEffect(() => () => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    if (audioRef.current && audioRef.current.state !== "closed") void audioRef.current.close();
  }, []);

  const memory = Math.min(65536, Math.round((progress / 19) * 65536));
  return <div className={`os-boot ${started ? "is-started" : "is-awaiting"} ${phase >= 4 ? "is-splash" : ""} ${exiting ? "is-exiting" : ""}`} role="dialog" aria-modal="true" aria-label="Inicio de EDAV Desktop 98">
    <div className="os-boot-glow" aria-hidden="true"/>
    {/* A11Y-05: la BIOS es decorativa y cambia cada 45 ms; no se anuncia. Solo hay un anuncio único abajo. */}
    <p className="sr-only" role="status">{started ? "Iniciando EDAV Desktop 98…" : ""}</p>
    <div className="os-boot-bios" aria-hidden="true">
      <div className="os-bios-header"><strong>EDAV BIOS</strong><span>v98.04.04</span></div>
      <p>Copyright (C) 2026 Emmanuel Dávila. All systems reserved.</p>
      <p>CPU: Creative Engine @ 404 MHz</p>
      <p>Memory Test: {started ? String(memory).padStart(5, "0") : "00000"}K {progress >= 19 ? "OK" : ""}<i className="os-bios-cursor"/></p>
      {phase >= 2 && <div className="os-boot-lines"><p>Detecting primary master ........ PORTFOLIO.EXE</p><p>Detecting design system ......... EDAV DESKTOP 98</p><p>Mouse interface ................. ONLINE</p><p>Audio controller ................ {soundStatus === "on" ? "SOUNDBLASTER READY" : "SILENT MODE"}</p></div>}
      {phase >= 3 && <div className="os-boot-lines"><p>Mounting C:\PROJECTS ............ {projects.length} ITEMS</p><p>Loading LASTFM.DRV .............. READY</p><p>Starting graphical interface .... OK</p></div>}
    </div>

    {!started && <div className="os-boot-prompt">
      <div className="os-boot-primary">
        <PixelLogo/>
        <p>EDAV PERSONAL COMPUTER</p>
        <strong>Presiona Enter o haz clic para iniciar</strong>
        <span>El gesto activa la secuencia de audio del sistema.</span>
        <button type="button" className="os-boot-start" autoFocus onClick={(event) => { event.stopPropagation(); void startBoot(); }}>Iniciar con sonido</button>
      </div>
    </div>}

    {phase >= 4 && <div className="os-boot-brand" aria-hidden="true"><div className="os-boot-logo-wrap"><PixelLogo/><span className="os-boot-orbit"/></div><strong>EDAV Desktop <i>98</i></strong><span>Sistema de portafolio personal</span><div className="os-boot-loader"><b style={{ transform: `translateX(${Math.max(0, progress - 60) * 2.5}px)` }}/></div><small>Preparando tu escritorio...</small></div>}

    <div className="os-boot-footer"><span>{started ? `POST ${Math.round(progress)}% · ${soundStatus === "on" ? "AUDIO ON" : soundStatus === "unavailable" ? "AUDIO N/A" : "AUDIO..."}` : "ENTER: iniciar · ESC: omitir"}</span><div className="os-boot-footer-actions">{onSwitchToStandard && <button type="button" className="os-boot-accessible" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSwitchToStandard(); }}>Vista web accesible</button>}<button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); finishBoot(true); }}>Omitir inicio <kbd>Esc</kbd></button></div></div>
  </div>;
}

function ProjectExplorer() {
  const router = useRouter();
  const [selected, setSelected] = useState(projects[0]);
  return <div className="os-explorer">
    <div className="os-toolbar"><button>←</button><button>→</button><button>↑</button><span>Dirección</span><div>C:\Mi trabajo\Todos</div></div>
    <div className="os-explorer-body"><aside><strong>Carpetas</strong><ul><li>▾ Escritorio</li><li className="active">　Mi trabajo</li><li>　Desarrollo web</li><li>　E-commerce</li><li>　Identidad visual</li></ul><div className="os-file-details"><small>SELECCIONADO</small><strong>{projectTitle(selected, "es")}</strong><span>{selected.category.es} · {selected.year}</span></div></aside><section><div className="os-file-grid">{projects.map((project) => <button className={selected.slug === project.slug ? "is-selected" : ""} key={project.slug} onClick={() => setSelected(project)} onDoubleClick={() => router.push(`/proyectos/${project.slug}`)} aria-label={`Seleccionar ${projectTitle(project, "es")}. Doble clic para abrir el caso.`}><span className="os-file-thumb"><Image src={project.image} alt={`Vista previa del proyecto ${projectTitle(project, "es")}`} fill sizes="120px"/></span><strong>{projectTitle(project, "es")}</strong><small>{project.category.es}</small></button>)}</div></section></div>
    <div className="os-preview-bar"><div><strong>{projectTitle(selected, "es")}</strong><span>{selected.summary.es}</span></div><Link className="os-98-button is-primary" href={`/proyectos/${selected.slug}`}>Abrir caso</Link></div>
  </div>;
}

function WelcomeApp({ openApp }: { openApp: (id: AppId) => void }) {
  return <div className="os-welcome">
    <div className="os-welcome-copy"><p className="os-kicker">BIENVENIDO A MI PC</p><h1>Sitios, productos y automatizaciones hechos a la medida.</h1><p>Soy <strong>{profile.name}</strong>, {lowerFirst(profile.headline.es)}. Construyo sitios, tiendas y productos digitales, y automatizo procesos para reducir el trabajo repetitivo.</p><div className="os-button-row"><button className="os-98-button is-primary" onClick={() => openApp("projects")}>Explorar mi trabajo</button><button className="os-98-button" onClick={() => openApp("contact")}>Iniciar proyecto</button></div></div>
    <div className="os-welcome-art" aria-hidden="true"><div className="os-chrome-disc"><span>ED</span></div><div className="os-orbit orbit-a"/><div className="os-orbit orbit-b"/><p>FULL STACK<br/><i>AUTOMATION</i><br/>SYSTEM</p></div>
    <div className="os-quick-launch"><button onClick={() => openApp("projects")}><DesktopIcon name="folder"/><span>{projects.length} proyectos</span></button><button onClick={() => openApp("services")}><DesktopIcon name="services"/><span>Servicios</span></button><button onClick={() => openApp("terminal")}><DesktopIcon name="terminal"/><span>Modo desarrollador</span></button></div>
  </div>;
}

function AboutApp() {
  return <div className="os-about"><aside><div className="os-user-card"><span>ED</span></div><strong>{profile.name}</strong><small>{profile.location.es}</small><div className="os-online"><i/> Disponible para proyectos</div></aside><section><p className="os-kicker">ABOUT_EMMANUEL.TXT</p><h2>Curioso por naturaleza.<br/>Práctico por oficio.</h2><p>{profile.tagline.es}</p><div className="os-system-specs"><div><span>Rol</span><strong>{profile.headline.es}</strong></div><div><span>Experiencia</span><strong>Desde {experienceSince}</strong></div><div><span>Proyectos</span><strong>{projects.length} documentados</strong></div></div><ul className="os-contact-links" aria-label="CV y contacto directo"><li><a href={cvHref.es} type="application/pdf">CV (ES, PDF)</a></li><li><a href={cvHref.en} type="application/pdf" hrefLang="en" lang="en">CV (EN, PDF)</a></li><li><a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a></li><li><a href={profile.contact.linkedin} target="_blank" rel="me noreferrer">LinkedIn</a></li><li><a href={profile.contact.github} target="_blank" rel="me noreferrer">GitHub</a></li></ul><div className="os-tech-marquee">{technologies.map((item) => <span key={item}>{item}</span>)}</div><Link className="os-98-button" href="/sobre-mi">Abrir perfil completo</Link></section></div>;
}

/** Textos de los componentes compartidos con la web, resueltos por el servidor (portada). */
export type DesktopCopy = { contactForm: ContactFormCopy; music: MusicCopy };

function WindowContent({ id, openApp, copy }: { id: AppId; openApp: (id: AppId) => void; copy: DesktopCopy }) {
  if (id === "welcome") return <WelcomeApp openApp={openApp}/>;
  if (id === "projects") return <ProjectExplorer/>;
  if (id === "services") return <ServicesWizard/>;
  if (id === "about") return <AboutApp/>;
  if (id === "contact") return <div className="os-contact-app"><div><p className="os-kicker">NUEVO MENSAJE</p><h2>Cuéntame qué quieres construir.</h2><p>Objetivo, alcance, público y referencias: con eso podemos comenzar una conversación útil.</p></div><ContactForm copy={copy.contactForm}/></div>;
  if (id === "media") return <div className="os-media-player"><MusicWidget copy={copy.music}/></div>;
  return <TerminalApp onOpen={(value) => { if (value in appMeta) openApp(value as AppId); }}/>;
}

export function DesktopShell({ copy, onSwitchToStandard, skipBoot = false }: { copy: DesktopCopy; onSwitchToStandard?: () => void; skipBoot?: boolean }) {
  const [windows, setWindows] = useState(initialWindows);
  const [startOpen, setStartOpen] = useState(false);
  const [crt, setCrt] = useState(true);
  const [sound, setSound] = useState(false);
  const [booting, setBooting] = useState(!skipBoot);
  const [time, setTime] = useState("");
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [notification, setNotification] = useState("Sistema listo — doble clic o Enter para explorar.");
  const drag = useRef<{ id: AppId; startX: number; startY: number; x: number; y: number } | null>(null);
  const resize = useRef<{ id: AppId; startX: number; startY: number; width: number; height: number; x: number; y: number } | null>(null);
  const maxZ = useMemo(() => Math.max(...windows.map((item) => item.z)), [windows]);
  const topVisibleZ = useMemo(() => Math.max(0, ...windows.filter((item) => item.open && !item.minimized).map((item) => item.z)), [windows]);
  const activeApp = windows.find((item) => item.open && !item.minimized && item.z === topVisibleZ)?.id;
  const clippyState: ClippyState = activeApp === "terminal" ? "SEARCHING" : activeApp === "contact" ? "WRITING" : "IDLE";

  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date()));
    update(); const timer = setInterval(update, 30000); return () => clearInterval(timer);
  }, []);
  useEffect(() => { const timer = setTimeout(() => setNotification(""), 5500); return () => clearTimeout(timer); }, [notification]);

  const beep = (frequency = 520) => {
    if (!sound) return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const audio = new AudioCtx(); const osc = audio.createOscillator(); const gain = audio.createGain(); osc.frequency.value = frequency; gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .07); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + .075); osc.addEventListener("ended", () => void audio.close(), { once: true });
  };
  const focus = (id: AppId) => setWindows((items) => items.map((item) => item.id === id ? { ...item, z: maxZ + 1, minimized: false } : item));
  const openApp = (id: AppId) => { beep(); setStartOpen(false); setContext(null); setWindows((items) => items.map((item) => item.id === id ? { ...item, open: true, minimized: false, z: maxZ + 1 } : item)); };
  const updateWindow = (id: AppId, patch: Partial<WindowState>) => setWindows((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const beginDrag = (event: React.PointerEvent<HTMLDivElement>, item: WindowState) => { if (item.maximized || innerWidth < 769) return; focus(item.id); drag.current = { id: item.id, startX: event.clientX, startY: event.clientY, x: item.x, y: item.y }; event.currentTarget.setPointerCapture(event.pointerId); };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => { const current = drag.current; if (!current) return; const nextX = Math.max(0, Math.min(innerWidth - 260, current.x + event.clientX - current.startX)); const nextY = Math.max(0, Math.min(innerHeight - 100, current.y + event.clientY - current.startY)); updateWindow(current.id, { x: nextX, y: nextY }); };
  const endDrag = () => { drag.current = null; };
  const beginResize = (event: React.PointerEvent<HTMLButtonElement>, item: WindowState) => { if (item.maximized || innerWidth < 769) return; event.preventDefault(); event.stopPropagation(); focus(item.id); resize.current = { id: item.id, startX: event.clientX, startY: event.clientY, width: item.width, height: item.height, x: item.x, y: item.y }; event.currentTarget.setPointerCapture(event.pointerId); };
  const moveResize = (event: React.PointerEvent<HTMLButtonElement>) => { const current = resize.current; if (!current) return; const maxWidth = Math.max(320, innerWidth - current.x - 4); const maxHeight = Math.max(220, innerHeight - current.y - 44); updateWindow(current.id, { width: Math.max(320, Math.min(maxWidth, current.width + event.clientX - current.startX)), height: Math.max(220, Math.min(maxHeight, current.height + event.clientY - current.startY)) }); };
  const endResize = () => { resize.current = null; };
  const finishBoot = useCallback(() => { setBooting(false); setNotification("Bienvenido a EDAV Desktop 98"); }, []);
  const iconsRef = useRef<HTMLDivElement>(null);
  // Evita perder el foco cuando el botón que abrió el escritorio queda oculto o la BIOS desaparece.
  useEffect(() => { if (!booting) iconsRef.current?.querySelector("button")?.focus(); }, [booting]);

  return <div className="desktop-os os-desktop" onClick={() => { setContext(null); }} onContextMenu={(event) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }); }}>
    {booting && <BootScreen onFinish={finishBoot} onSwitchToStandard={onSwitchToStandard}/>}<CrtOverlay enabled={crt}/>
    {!booting && <RetroClippy state={clippyState} options={[{ label: "Ver proyectos", onSelect: () => openApp("projects") }, { label: "Contactar", onSelect: () => openApp("contact") }]}/>} 
    <div className="os-wallpaper" aria-hidden="true"><div className="os-wallpaper-sun"/><div className="os-wallpaper-grid"/><div className="os-wallpaper-word">EDAV<span>98</span></div><div className="os-wallpaper-ring ring-one"/><div className="os-wallpaper-ring ring-two"/></div>
    <a className="os-skip-link" href="#welcome-content" onClick={() => openApp("welcome")}>Ir al contenido principal</a>
    <div className="os-desktop-icons" ref={iconsRef} role="group" aria-label="Aplicaciones del escritorio">{(["projects", "services", "about", "contact", "media", "terminal"] as AppId[]).map((id) => <button key={id} onClick={(event) => { event.stopPropagation(); openApp(id); }}><span className={`os-icon-art icon-${id}`}><DesktopIcon name={appMeta[id].icon}/></span><span>{appMeta[id].title}</span></button>)}{onSwitchToStandard && <button onClick={(event) => { event.stopPropagation(); onSwitchToStandard(); }}><span className="os-icon-art icon-accessible-web"><DesktopIcon name="welcome"/></span><span>Vista web accesible</span></button>}</div>
    <div className="os-mobile-label"><PixelLogo/><div><strong>EDAV Desktop 98</strong><span>Accesos rápidos</span></div></div>
    <div className="os-window-layer">{windows.filter((item) => item.open && !item.minimized).map((item) => <section id={item.id === "welcome" ? "welcome-content" : undefined} className={`os-window ${item.maximized ? "is-maximized" : ""} ${item.z === topVisibleZ ? "is-active" : "is-inactive"} app-${item.id}`} style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.z }} key={item.id} onPointerDown={() => focus(item.id)} aria-label={appMeta[item.id].file}>
      <div className="os-titlebar" onPointerDown={(event) => beginDrag(event, item)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onDoubleClick={() => updateWindow(item.id, { maximized: !item.maximized })}><div><DesktopIcon name={appMeta[item.id].icon}/><strong>{appMeta[item.id].file}</strong></div><div className="os-window-buttons" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><button type="button" title="Minimizar" aria-label={`Minimizar ${appMeta[item.id].title}`} onClick={(event) => { event.stopPropagation(); updateWindow(item.id, { minimized: true }); beep(360); }}>_</button><button type="button" title={item.maximized ? "Restaurar" : "Maximizar"} aria-label={`${item.maximized ? "Restaurar" : "Maximizar"} ${appMeta[item.id].title}`} onClick={(event) => { event.stopPropagation(); updateWindow(item.id, { maximized: !item.maximized }); beep(450); }}>{item.maximized ? "❐" : "□"}</button><button type="button" title="Cerrar" className="close" aria-label={`Cerrar ${appMeta[item.id].title}`} onClick={(event) => { event.stopPropagation(); updateWindow(item.id, { open: false }); beep(260); }}>×</button></div></div>
      <div className="os-menu-strip"><span>Archivo</span><span>Editar</span><span>Ver</span><span>Ayuda</span></div><div className="os-window-content"><WindowContent copy={copy} id={item.id} openApp={openApp}/></div><div className="os-statusbar"><span>{appMeta[item.id].title}</span><span>EDAV Desktop 98</span></div>
      {!item.maximized && <button type="button" className="os-resize-handle" aria-label={`Redimensionar ${appMeta[item.id].title}`} title="Arrastra para redimensionar" onPointerDown={(event) => beginResize(event, item)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize} onKeyDown={(event) => { const step = event.shiftKey ? 50 : 20; if (event.key === "ArrowRight") updateWindow(item.id, { width: item.width + step }); else if (event.key === "ArrowLeft") updateWindow(item.id, { width: Math.max(320, item.width - step) }); else if (event.key === "ArrowDown") updateWindow(item.id, { height: item.height + step }); else if (event.key === "ArrowUp") updateWindow(item.id, { height: Math.max(220, item.height - step) }); else return; event.preventDefault(); }}/>} 
    </section>)}</div>
    {notification && <div className="os-notification" role="status"><PixelLogo small/><div><strong>EDAV Desktop 98</strong><p>{notification}</p></div><button onClick={() => setNotification("")} aria-label="Cerrar notificación">×</button></div>}
    {context && <div className="os-context-menu" style={{ left: context.x, top: context.y }} onClick={(event) => event.stopPropagation()}><button onClick={() => openApp("terminal")}><DesktopIcon name="terminal"/>Abrir terminal</button><button onClick={() => setNotification("Escritorio actualizado.")}>Actualizar</button><hr/><button onClick={() => setCrt((value) => !value)}>{crt ? "Desactivar" : "Activar"} efecto CRT</button><button onClick={() => openApp("about")}>Propiedades</button></div>}
    {startOpen && <div className="os-start-menu" onClick={(event) => event.stopPropagation()}><div className="os-start-brand"><span>EDAV</span><strong>98</strong></div><div className="os-start-main"><header><div className="os-start-avatar">ED</div><div><strong>Emmanuel Dávila</strong><span>Full Stack y automatización</span></div></header><div className="os-start-apps">{(Object.keys(appMeta) as AppId[]).map((id) => <button key={id} onClick={() => openApp(id)}><span className={`os-mini-icon icon-${id}`}><DesktopIcon name={appMeta[id].icon}/></span><div><strong>{appMeta[id].title}</strong><small>{appMeta[id].file}</small></div></button>)}</div><footer>{onSwitchToStandard && <button onClick={onSwitchToStandard}>Vista web accesible</button>}<button onClick={() => setSound((value) => !value)}>Sonido: {sound ? "ON" : "OFF"}</button><button onClick={() => setNotification("Gracias por visitar mi computador personal.")}><DesktopIcon name="power"/>Cerrar sesión</button></footer></div></div>}
    <nav className="os-taskbar" aria-label="Barra de tareas"><button className={startOpen ? "os-start-button is-active" : "os-start-button"} onClick={(event) => { event.stopPropagation(); setStartOpen((value) => !value); beep(); }}><PixelLogo small/><strong>Inicio</strong></button><div className="os-task-tabs">{windows.filter((item) => item.open).map((item) => <button className={!item.minimized && item.z === topVisibleZ ? "is-active" : ""} key={item.id} onClick={(event) => { event.stopPropagation(); if (!item.minimized && item.z === topVisibleZ) updateWindow(item.id, { minimized: true }); else focus(item.id); }}><DesktopIcon name={appMeta[item.id].icon}/><span>{appMeta[item.id].title}</span></button>)}</div><div className="os-tray">{onSwitchToStandard && <button className="os-view-switch" onClick={onSwitchToStandard} aria-label="Cambiar a vista web convencional">WEB</button>}<button className={crt ? "is-on" : ""} onClick={() => setCrt((value) => !value)} aria-label="Alternar efecto CRT">CRT</button><button onClick={() => setSound((value) => !value)} aria-label="Alternar sonido">{sound ? "VOL" : "MUTE"}</button><time>{time}</time></div></nav>
  </div>;
}
