import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudio } from "@/components/os/audio";

/** AudioContext simulado: cuenta contextos y osciladores creados. */
function installFakes() {
  const target = new EventTarget();
  const stats = { contexts: 0, oscillators: 0 };
  class FakeContext {
    state = "running";
    currentTime = 0;
    destination = {};
    constructor() { stats.contexts++; }
    createOscillator() { stats.oscillators++; return { type: "", frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  vi.stubGlobal("window", target);
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("navigator", {});
  return { target, stats };
}

afterEach(() => vi.unstubAllGlobals());

describe("audio opcional", () => {
  it("apagado por defecto: no crea contexto ni suena", () => {
    const { stats } = installFakes();
    const audio = createAudio();
    audio.play("open");
    expect(stats).toEqual({ contexts: 0, oscillators: 0 });
  });
  it("activado pero sin gesto del usuario: no suena ni crea contexto", () => {
    const { stats } = installFakes();
    const audio = createAudio();
    audio.setEnabled(true);
    audio.play("boot");
    expect(stats).toEqual({ contexts: 0, oscillators: 0 });
  });
  it("tras un gesto suena; al apagarlo vuelve a callar", () => {
    const { target, stats } = installFakes();
    const audio = createAudio();
    audio.setEnabled(true);
    target.dispatchEvent(new Event("pointerdown"));
    expect(stats.contexts).toBe(1);
    audio.play("open");
    expect(stats.oscillators).toBe(1);
    audio.play("error");
    expect(stats.oscillators).toBe(3);
    audio.setEnabled(false);
    audio.play("open");
    expect(stats.oscillators).toBe(3);
    audio.dispose();
  });
  it("sin Web Audio no lanza", () => {
    installFakes();
    vi.stubGlobal("AudioContext", undefined);
    const audio = createAudio();
    audio.setEnabled(true);
    expect(() => audio.play("open")).not.toThrow();
  });
});
