import { describe, expect, it } from "vitest";
import { BOOT_KEY, bootProgress, bootSkipReason, markBootShown, wasBootShown, type BootInputs } from "@/lib/os/boot";
import type { StorageLike } from "@/lib/os/persistence";

const clean: BootInputs = { reducedMotion: false, interacted: false, pocket: false, deepLink: false, alreadyShown: false };
function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("elegibilidad del arranque", () => {
  it("sin ningún motivo, se muestra", () => expect(bootSkipReason(clean)).toBeNull());
  it.each(["reducedMotion", "interacted", "pocket", "deepLink", "alreadyShown"] as const)("se omite por %s", (reason) => {
    expect(bootSkipReason({ ...clean, [reason]: true })).toBe(reason);
  });
  it("con varios motivos informa del primero por prioridad", () => {
    expect(bootSkipReason({ reducedMotion: true, interacted: true, pocket: true, deepLink: true, alreadyShown: true })).toBe("reducedMotion");
  });
});

describe("memoria por sesión", () => {
  it("una vez marcado, wasBootShown lo ve", () => {
    const storage = memory();
    expect(wasBootShown(storage)).toBe(false);
    markBootShown(storage);
    expect(storage.data.get(BOOT_KEY)).toBe("1");
    expect(wasBootShown(storage)).toBe(true);
  });
  it("tolera almacenamiento ausente o que lanza", () => {
    const broken: StorageLike = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() {} };
    expect(wasBootShown(null)).toBe(false);
    expect(wasBootShown(broken)).toBe(false);
    expect(() => markBootShown(broken)).not.toThrow();
    expect(() => markBootShown(null)).not.toThrow();
  });
});

describe("progreso", () => {
  it("acotado a 0-100 y tolerante a valores raros", () => {
    expect(bootProgress(-5)).toBe(0);
    expect(bootProgress(Number.NaN)).toBe(0);
    expect(bootProgress(1000, 2000)).toBe(50);
    expect(bootProgress(99999)).toBe(100);
  });
});
