"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ContactForm, type ContactFormCopy } from "@/components/contact-form";
import { MusicWidget, type MusicCopy } from "@/components/music-widget";
import { experienceSince } from "@/content/experience";
import { format, roleInSentence } from "@/content/format";
import { profile, technologies } from "@/content/profile";
import { href, intlLocale } from "@/content/routes";
import { cvHref } from "@/content/site";
import type { Locale } from "@/content/types";
import type { Resolved, Ui } from "@/content/ui";
import { useLocale } from "@/lib/i18n/locale-context";
// El CSS del escritorio solo se descarga con este módulo (next/dynamic, ssr: false).
import "@/app/desktop.css";
import { CrtOverlay } from "./crt-overlay";
import { DesktopIcon, type DesktopIconName, PixelLogo } from "./desktop-icons";
import { RetroClippy, type ClippyState } from "./RetroClippy";
import { ServicesWizard } from "./services-wizard";
import { TerminalApp } from "./terminal-app";

type AppId = "welcome" | "projects" | "services" | "about" | "contact" | "media" | "terminal";
type WindowState = { id: AppId; open: boolean; minimized: boolean; maximized: boolean; z: number; x: number; y: number; width: number; height: number };

const appIcons: Record<AppId, DesktopIconName> = {
  welcome: "welcome", projects: "folder", services: "services", about: "about", contact: "contact", media: "music", terminal: "terminal",
};

/** Microcopy del escritorio (`ui.os`), resuelto por el servidor para un idioma. */
export type OsCopy = Resolved<Ui["os"]>;

/** Textos del escritorio + idioma, para los subcomponentes sin pasar props en cadena. */
/**
 * Proyecto tal como lo pinta el explorador: solo esos campos y ya en el idioma de la página. El
 * servidor (HomeView) hace la proyección; así el chunk del escritorio no arrastra content/projects.ts.
 */
export type DesktopProject = { slug: string; title: string; category: string; year: string; summary: string; image: string; href: string };

const OsContext = createContext<{ os: OsCopy; locale: Locale; projects: DesktopProject[] } | null>(null);
function useOs() {
  const value = useContext(OsContext);
  if (!value) throw new Error("useOs fuera de DesktopShell");
  return value;
}

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
  const { os, projects } = useOs();
  const boot = os.boot;
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [soundStatus, setSoundStatus] = useState<"idle" | "on" | "unavailable">("idle");
  const [exiting, setExiting] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const completedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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
      if (!AudioCtor) throw new Error(boot.audioUnavailable);
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
  }, [boot.audioUnavailable, playTone, started]);

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

  // Al iniciar desaparece el botón que tenía el foco: el foco pasa al propio diálogo (aria-modal), no a <body>.
  useEffect(() => {
    if (!started) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
  }, [started]);

  const memory = Math.min(65536, Math.round((progress / 19) * 65536));
  return <div className={`os-boot ${started ? "is-started" : "is-awaiting"} ${phase >= 4 ? "is-splash" : ""} ${exiting ? "is-exiting" : ""}`} role="dialog" aria-modal="true" aria-label={boot.region} ref={dialogRef} tabIndex={-1}>
    <div className="os-boot-glow" aria-hidden="true"/>
    {/* A11Y-05: la BIOS es decorativa y cambia cada 45 ms; no se anuncia. Solo hay un anuncio único abajo. */}
    <p className="sr-only" role="status">{started ? boot.announce : ""}</p>
    <div className="os-boot-bios" aria-hidden="true">
      <div className="os-bios-header"><strong>EDAV BIOS</strong><span>v98.04.04</span></div>
      <p>{boot.biosLines[0]}</p>
      <p>{boot.biosLines[1]}</p>
      <p>Memory Test: {started ? String(memory).padStart(5, "0") : "00000"}K {progress >= 19 ? "OK" : ""}<i className="os-bios-cursor"/></p>
      {phase >= 2 && <div className="os-boot-lines"><p>{boot.biosLines[2]}</p><p>{boot.biosLines[3]}</p><p>{boot.biosLines[4]}</p><p>Audio controller ................ {soundStatus === "on" ? "SOUNDBLASTER READY" : "SILENT MODE"}</p></div>}
      {phase >= 3 && <div className="os-boot-lines"><p>{format(boot.mountProjects, { count: projects.length })}</p><p>{boot.biosLines[5]}</p><p>{boot.biosLines[6]}</p></div>}
    </div>

    {!started && <div className="os-boot-prompt">
      <div className="os-boot-primary">
        <PixelLogo/>
        <p>EDAV PERSONAL COMPUTER</p>
        <strong>{boot.pressToStart}</strong>
        <span>{boot.gestureNote}</span>
        <button type="button" className="os-boot-start" autoFocus onClick={(event) => { event.stopPropagation(); void startBoot(); }}>{boot.startWithSound}</button>
      </div>
    </div>}

    {phase >= 4 && <div className="os-boot-brand" aria-hidden="true"><div className="os-boot-logo-wrap"><PixelLogo/><span className="os-boot-orbit"/></div><strong>EDAV Desktop <i>98</i></strong><span>{boot.subtitle}</span><div className="os-boot-loader"><b style={{ transform: `translateX(${Math.max(0, progress - 60) * 2.5}px)` }}/></div><small>{boot.preparing}</small></div>}

    <div className="os-boot-footer"><span>{started ? `POST ${Math.round(progress)}% · ${soundStatus === "on" ? "AUDIO ON" : soundStatus === "unavailable" ? "AUDIO N/A" : "AUDIO..."}` : boot.keysHint}</span><div className="os-boot-footer-actions">{onSwitchToStandard && <button type="button" className="os-boot-accessible" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSwitchToStandard(); }}>{boot.accessibleView}</button>}<button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); finishBoot(true); }}>{boot.skip} <kbd>Esc</kbd></button></div></div>
  </div>;
}

function ProjectExplorer() {
  const router = useRouter();
  const { os, projects } = useOs();
  const copy = os.explorer;
  const [selected, setSelected] = useState(projects[0]);
  return <div className="os-explorer">
    <div className="os-toolbar"><button>←</button><button>→</button><button>↑</button><span>{copy.address}</span><div>{copy.path}</div></div>
    <div className="os-explorer-body"><aside><strong>{copy.folders}</strong><ul><li>▾ {copy.desktop}</li><li className="active">　{os.apps.projects.title}</li><li>　{copy.folderWeb}</li><li>　{copy.folderCommerce}</li><li>　{copy.folderBrand}</li></ul><div className="os-file-details"><small>{copy.selected}</small><strong>{selected.title}</strong><span>{selected.category} · {selected.year}</span></div></aside><section><div className="os-file-grid">{projects.map((project) => <button className={selected.slug === project.slug ? "is-selected" : ""} key={project.slug} onClick={() => setSelected(project)} onDoubleClick={() => router.push(project.href)} aria-label={format(copy.selectItem, { title: project.title })}><span className="os-file-thumb"><Image src={project.image} alt={format(copy.previewAlt, { title: project.title })} fill sizes="120px"/></span><strong>{project.title}</strong><small>{project.category}</small></button>)}</div></section></div>
    <div className="os-preview-bar"><div><strong>{selected.title}</strong><span>{selected.summary}</span></div><Link className="os-98-button is-primary" href={selected.href}>{copy.openCase}</Link></div>
  </div>;
}

function WelcomeApp({ openApp }: { openApp: (id: AppId) => void }) {
  const { os, locale, projects } = useOs();
  const copy = os.welcome;
  // El nombre va en <strong>: se parte la plantilla por `{name}`.
  const [beforeName, afterName = ""] = copy.intro.split("{name}");
  return <div className="os-welcome">
    <div className="os-welcome-copy"><p className="os-kicker">{copy.kicker}</p><h1>{copy.title}</h1><p>{beforeName}<strong>{profile.name}</strong>{format(afterName, { role: roleInSentence(profile.headline[locale], locale) })}</p><div className="os-button-row"><button className="os-98-button is-primary" onClick={() => openApp("projects")}>{copy.exploreWork}</button><button className="os-98-button" onClick={() => openApp("contact")}>{copy.startProject}</button></div></div>
    <div className="os-welcome-art" aria-hidden="true"><div className="os-chrome-disc"><span>ED</span></div><div className="os-orbit orbit-a"/><div className="os-orbit orbit-b"/><p>FULL STACK<br/><i>AUTOMATION</i><br/>SYSTEM</p></div>
    <div className="os-quick-launch"><button onClick={() => openApp("projects")}><DesktopIcon name="folder"/><span>{format(copy.projectsCount, { count: projects.length })}</span></button><button onClick={() => openApp("services")}><DesktopIcon name="services"/><span>{copy.services}</span></button><button onClick={() => openApp("terminal")}><DesktopIcon name="terminal"/><span>{copy.developerMode}</span></button></div>
  </div>;
}

function AboutApp() {
  const { os, locale, projects } = useOs();
  const copy = os.about;
  const other: Locale = locale === "es" ? "en" : "es";
  return <div className="os-about"><aside><div className="os-user-card"><span>ED</span></div><strong>{profile.name}</strong><small>{profile.location[locale]}</small><div className="os-online"><i/> {copy.available}</div></aside><section><p className="os-kicker">{copy.kicker}</p><h2>{copy.titleLine1}<br/>{copy.titleLine2}</h2><p>{profile.tagline[locale]}</p><div className="os-system-specs"><div><span>{copy.role}</span><strong>{profile.headline[locale]}</strong></div><div><span>{copy.experience}</span><strong>{format(copy.since, { year: experienceSince })}</strong></div><div><span>{copy.projects}</span><strong>{format(copy.projectsValue, { count: projects.length })}</strong></div></div><ul className="os-contact-links" aria-label={copy.contactLinks}><li><a href={cvHref[locale]} type="application/pdf">{locale === "es" ? copy.cvEs : copy.cvEn}</a></li><li><a href={cvHref[other]} type="application/pdf" hrefLang={other} lang={other}>{other === "es" ? copy.cvEs : copy.cvEn}</a></li><li><a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a></li><li><a href={profile.contact.linkedin} target="_blank" rel="me noreferrer">LinkedIn</a></li><li><a href={profile.contact.github} target="_blank" rel="me noreferrer">GitHub</a></li></ul><div className="os-tech-marquee">{technologies.map((item) => <span key={item}>{item}</span>)}</div><Link className="os-98-button" href={href("about", locale)}>{copy.openProfile}</Link></section></div>;
}

/** Textos de los componentes compartidos con la web, resueltos por el servidor (portada). */
export type DesktopCopy = { contactForm: ContactFormCopy; music: MusicCopy; os: OsCopy; projects: DesktopProject[] };

function WindowContent({ id, openApp, copy }: { id: AppId; openApp: (id: AppId) => void; copy: DesktopCopy }) {
  if (id === "welcome") return <WelcomeApp openApp={openApp}/>;
  if (id === "projects") return <ProjectExplorer/>;
  if (id === "services") return <ServicesWizard copy={copy.os.wizard}/>;
  if (id === "about") return <AboutApp/>;
  if (id === "contact") return <div className="os-contact-app"><div><p className="os-kicker">{copy.os.contact.kicker}</p><h2>{copy.os.contact.title}</h2><p>{copy.os.contact.copy}</p></div><ContactForm copy={copy.contactForm}/></div>;
  if (id === "media") return <div className="os-media-player"><MusicWidget copy={copy.music}/></div>;
  return <TerminalApp copy={copy.os.terminal} onOpen={(value) => { if (value in appIcons) openApp(value as AppId); }}/>;
}

export function DesktopShell({ copy, onSwitchToStandard, skipBoot = false }: { copy: DesktopCopy; onSwitchToStandard?: () => void; skipBoot?: boolean }) {
  const locale = useLocale();
  const os = copy.os;
  const desk = os.desktop;
  const win = os.window;
  const osContext = useMemo(() => ({ os, locale, projects: copy.projects }), [os, locale, copy.projects]);
  const [windows, setWindows] = useState(initialWindows);
  const [startOpen, setStartOpen] = useState(false);
  const [crt, setCrt] = useState(true);
  const [sound, setSound] = useState(false);
  const [booting, setBooting] = useState(!skipBoot);
  const [time, setTime] = useState("");
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [notification, setNotification] = useState(desk.readyNotice);
  const drag = useRef<{ id: AppId; startX: number; startY: number; x: number; y: number } | null>(null);
  const resize = useRef<{ id: AppId; startX: number; startY: number; width: number; height: number; x: number; y: number } | null>(null);
  const maxZ = useMemo(() => Math.max(...windows.map((item) => item.z)), [windows]);
  const topVisibleZ = useMemo(() => Math.max(0, ...windows.filter((item) => item.open && !item.minimized).map((item) => item.z)), [windows]);
  const activeApp = windows.find((item) => item.open && !item.minimized && item.z === topVisibleZ)?.id;
  const clippyState: ClippyState = activeApp === "terminal" ? "SEARCHING" : activeApp === "contact" ? "WRITING" : "IDLE";

  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat(intlLocale[locale], { hour: "numeric", minute: "2-digit" }).format(new Date()));
    update(); const timer = setInterval(update, 30000); return () => clearInterval(timer);
  }, [locale]);
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
  const finishBoot = useCallback(() => { setBooting(false); setNotification(desk.welcomeNotice); }, [desk.welcomeNotice]);
  const iconsRef = useRef<HTMLDivElement>(null);
  // Evita perder el foco cuando el botón que abrió el escritorio queda oculto o la BIOS desaparece.
  useEffect(() => { if (!booting) iconsRef.current?.querySelector("button")?.focus(); }, [booting]);

  // Mientras el escritorio está montado: shell público oculto y sin scroll de fondo (globals.css).
  useEffect(() => {
    document.documentElement.setAttribute("data-os-open", "");
    return () => document.documentElement.removeAttribute("data-os-open");
  }, []);

  return <OsContext.Provider value={osContext}><div className="desktop-os os-desktop" data-theme="xp" onClick={() => { setContext(null); }} onContextMenu={(event) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }); }}>
    {booting && <BootScreen onFinish={finishBoot} onSwitchToStandard={onSwitchToStandard}/>}<CrtOverlay enabled={crt}/>
    {!booting && <RetroClippy copy={os.clippy} state={clippyState} options={[{ label: os.clippy.viewProjects, onSelect: () => openApp("projects") }, { label: os.clippy.contact, onSelect: () => openApp("contact") }]}/>} 
    <div className="os-wallpaper" aria-hidden="true"><div className="os-wallpaper-sun"/><div className="os-wallpaper-grid"/><div className="os-wallpaper-word">EDAV<span>98</span></div><div className="os-wallpaper-ring ring-one"/><div className="os-wallpaper-ring ring-two"/></div>
    {/* Mientras arranca, la BIOS es modal: el resto del escritorio queda inerte (ni foco ni lectores). */}
    <a inert={booting} className="os-skip-link" href="#welcome-content" onClick={() => openApp("welcome")}>{desk.skipLink}</a>
    <div inert={booting} className="os-desktop-icons" ref={iconsRef} role="group" aria-label={desk.iconsGroup}>{(["projects", "services", "about", "contact", "media", "terminal"] as AppId[]).map((id) => <button key={id} onClick={(event) => { event.stopPropagation(); openApp(id); }}><span className={`os-icon-art icon-${id}`}><DesktopIcon name={appIcons[id]}/></span><span>{os.apps[id].title}</span></button>)}{onSwitchToStandard && <button onClick={(event) => { event.stopPropagation(); onSwitchToStandard(); }}><span className="os-icon-art icon-accessible-web"><DesktopIcon name="welcome"/></span><span>{desk.accessibleView}</span></button>}</div>
    <div inert={booting} className="os-mobile-label"><PixelLogo/><div><strong>{os.productName}</strong><span>{desk.quickLaunch}</span></div></div>
    <div inert={booting} className="os-window-layer">{windows.filter((item) => item.open && !item.minimized).map((item) => <section id={item.id === "welcome" ? "welcome-content" : undefined} className={`os-window ${item.maximized ? "is-maximized" : ""} ${item.z === topVisibleZ ? "is-active" : "is-inactive"} app-${item.id}`} style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.z }} key={item.id} onPointerDown={() => focus(item.id)} aria-label={os.apps[item.id].file}>
      <div className="os-titlebar" onPointerDown={(event) => beginDrag(event, item)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onDoubleClick={() => updateWindow(item.id, { maximized: !item.maximized })}><div><DesktopIcon name={appIcons[item.id]}/><strong>{os.apps[item.id].file}</strong></div><div className="os-window-buttons" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><button type="button" title={win.minimize} aria-label={format(win.actionOn, { action: win.minimize, title: os.apps[item.id].title })} onClick={(event) => { event.stopPropagation(); updateWindow(item.id, { minimized: true }); beep(360); }}>_</button><button type="button" title={item.maximized ? win.restore : win.maximize} aria-label={format(win.actionOn, { action: item.maximized ? win.restore : win.maximize, title: os.apps[item.id].title })} onClick={(event) => { event.stopPropagation(); updateWindow(item.id, { maximized: !item.maximized }); beep(450); }}>{item.maximized ? "❐" : "□"}</button><button type="button" title={win.close} className="close" aria-label={format(win.actionOn, { action: win.close, title: os.apps[item.id].title })} onClick={(event) => { event.stopPropagation(); updateWindow(item.id, { open: false }); beep(260); }}>×</button></div></div>
      <div className="os-menu-strip"><span>{win.menuFile}</span><span>{win.menuEdit}</span><span>{win.menuView}</span><span>{win.menuHelp}</span></div><div className="os-window-content"><WindowContent copy={copy} id={item.id} openApp={openApp}/></div><div className="os-statusbar"><span>{os.apps[item.id].title}</span><span>{os.productName}</span></div>
      {!item.maximized && <button type="button" className="os-resize-handle" aria-label={format(win.resize, { title: os.apps[item.id].title })} title={win.resizeHint} onPointerDown={(event) => beginResize(event, item)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize} onKeyDown={(event) => { const step = event.shiftKey ? 50 : 20; if (event.key === "ArrowRight") updateWindow(item.id, { width: item.width + step }); else if (event.key === "ArrowLeft") updateWindow(item.id, { width: Math.max(320, item.width - step) }); else if (event.key === "ArrowDown") updateWindow(item.id, { height: item.height + step }); else if (event.key === "ArrowUp") updateWindow(item.id, { height: Math.max(220, item.height - step) }); else return; event.preventDefault(); }}/>} 
    </section>)}</div>
    {notification && <div inert={booting} className="os-notification" role="status"><PixelLogo small/><div><strong>{os.productName}</strong><p>{notification}</p></div><button onClick={() => setNotification("")} aria-label={desk.closeNotification}>×</button></div>}
    {context && <div className="os-context-menu" style={{ left: context.x, top: context.y }} onClick={(event) => event.stopPropagation()}><button onClick={() => openApp("terminal")}><DesktopIcon name="terminal"/>{desk.openTerminal}</button><button onClick={() => setNotification(desk.refreshedNotice)}>{desk.refresh}</button><hr/><button onClick={() => setCrt((value) => !value)}>{crt ? desk.disableCrt : desk.enableCrt}</button><button onClick={() => openApp("about")}>{desk.properties}</button></div>}
    {startOpen && <div className="os-start-menu" onClick={(event) => event.stopPropagation()}><div className="os-start-brand"><span>EDAV</span><strong>98</strong></div><div className="os-start-main"><header><div className="os-start-avatar">ED</div><div><strong>{profile.name}</strong><span>{desk.startTagline}</span></div></header><div className="os-start-apps">{(Object.keys(appIcons) as AppId[]).map((id) => <button key={id} onClick={() => openApp(id)}><span className={`os-mini-icon icon-${id}`}><DesktopIcon name={appIcons[id]}/></span><div><strong>{os.apps[id].title}</strong><small>{os.apps[id].file}</small></div></button>)}</div><footer>{onSwitchToStandard && <button onClick={onSwitchToStandard}>{desk.accessibleView}</button>}<button onClick={() => setSound((value) => !value)}>{format(desk.sound, { state: sound ? "ON" : "OFF" })}</button><button onClick={() => setNotification(desk.signOutNotice)}><DesktopIcon name="power"/>{desk.signOut}</button></footer></div></div>}
    <nav inert={booting} className="os-taskbar" aria-label={desk.taskbar}><button className={startOpen ? "os-start-button is-active" : "os-start-button"} onClick={(event) => { event.stopPropagation(); setStartOpen((value) => !value); beep(); }}><PixelLogo small/><strong>{desk.start}</strong></button><div className="os-task-tabs">{windows.filter((item) => item.open).map((item) => <button className={!item.minimized && item.z === topVisibleZ ? "is-active" : ""} key={item.id} onClick={(event) => { event.stopPropagation(); if (!item.minimized && item.z === topVisibleZ) updateWindow(item.id, { minimized: true }); else focus(item.id); }}><DesktopIcon name={appIcons[item.id]}/><span>{os.apps[item.id].title}</span></button>)}</div><div className="os-tray">{onSwitchToStandard && <button className="os-view-switch" onClick={onSwitchToStandard} aria-label={desk.switchToWeb}>WEB</button>}<button className={crt ? "is-on" : ""} onClick={() => setCrt((value) => !value)} aria-label={desk.toggleCrt}>CRT</button><button onClick={() => setSound((value) => !value)} aria-label={desk.toggleSound}>{sound ? "VOL" : "MUTE"}</button><time>{time}</time></div></nav>
  </div></OsContext.Provider>;
}
