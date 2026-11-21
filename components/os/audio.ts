/**
 * Audio opcional del SO (docs/arquitectura-os.md §5.5): Web Audio con osciladores, sin assets.
 * Apagado por defecto y solo tras un gesto del usuario: el `AudioContext` no se crea hasta que hay
 * sonido activado Y el usuario ha pulsado o tecleado (política de autoplay). Sin gesto, `play` no hace nada.
 * Los tonos son los del overlay anterior (arranque, apertura, error), con volumen bajo.
 */
export type SoundKind = "boot" | "open" | "close" | "error";

type Tone = { freq: number; delay: number; dur: number; vol: number; type?: OscillatorType };

const TONES: Record<SoundKind, readonly Tone[]> = {
  boot: [
    { freq: 261.63, delay: 0, dur: 0.32, vol: 0.025, type: "sine" },
    { freq: 329.63, delay: 0.05, dur: 0.32, vol: 0.02, type: "sine" },
    { freq: 392, delay: 0.1, dur: 0.42, vol: 0.02, type: "sine" },
  ],
  open: [{ freq: 520, delay: 0, dur: 0.07, vol: 0.03 }],
  close: [{ freq: 260, delay: 0, dur: 0.07, vol: 0.03 }],
  error: [
    { freq: 196, delay: 0, dur: 0.1, vol: 0.03 },
    { freq: 147, delay: 0.1, dur: 0.16, vol: 0.03 },
  ],
};

export type OsAudio = {
  setEnabled(on: boolean): void;
  play(kind: SoundKind): void;
  dispose(): void;
};

type AudioCtor = typeof AudioContext;

export function createAudio(): OsAudio {
  let enabled = false;
  let unlocked = false;
  let context: AudioContext | null = null;
  let listening = false;

  const ctor = (): AudioCtor | undefined => {
    const w = globalThis as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    return w.AudioContext ?? w.webkitAudioContext;
  };
  const ensure = (): AudioContext | null => {
    if (context) return context;
    const Ctor = ctor();
    if (!Ctor) return null;
    try { context = new Ctor(); } catch { context = null; }
    return context;
  };
  const onGesture = () => {
    unlocked = true;
    stopListening();
    if (enabled) void ensure()?.resume().catch(() => {});
  };
  const startListening = () => {
    if (listening || unlocked || typeof window === "undefined") return;
    listening = true;
    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("keydown", onGesture, true);
  };
  function stopListening() {
    if (!listening) return;
    listening = false;
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
  }

  return {
    setEnabled(on) {
      enabled = on;
      if (on) {
        // Activarlo desde un control ya es un gesto del usuario: si hay actividad previa, se desbloquea.
        if (typeof navigator !== "undefined" && (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive) unlocked = true;
        if (unlocked) void ensure()?.resume().catch(() => {}); else startListening();
      } else {
        void context?.suspend().catch(() => {});
      }
    },
    play(kind) {
      if (!enabled || !unlocked) return;
      const audio = ensure();
      if (!audio) return;
      if (audio.state !== "running") { void audio.resume().catch(() => {}); return; }
      for (const tone of TONES[kind]) {
        const start = audio.currentTime + tone.delay;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = tone.type ?? "square";
        oscillator.frequency.setValueAtTime(tone.freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(tone.vol, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + tone.dur + 0.02);
      }
    },
    dispose() {
      stopListening();
      void context?.close().catch(() => {});
      context = null;
    },
  };
}
