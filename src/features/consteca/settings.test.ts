import { describe, expect, it } from "vitest";
import type { SearchPreferences } from "@/features/consteca/types";

describe("ConsTECA search preferences and settings", () => {
  it("carrega e valida preferências completas com valores padrão", () => {
    const prefs: SearchPreferences = {
      kind: "smart",
      sourceIds: ["lo", "dac"],
      view: "grouped",
      smartLimit: 20,
      literalLimit: 10,
      miniTextWindow: 3,
      highlightEnabled: true,
      minScore: null,
    };

    expect(prefs.kind).toBe("smart");
    expect(prefs.miniTextWindow).toBe(3);
    expect(prefs.highlightEnabled).toBe(true);
    expect(prefs.minScore).toBeNull();
  });

  it("permite customizar limites e janela de contexto", () => {
    const prefs: SearchPreferences = {
      kind: "literal",
      sourceIds: ["mini_arlindo"],
      view: "ranked",
      smartLimit: 50,
      literalLimit: 25,
      miniTextWindow: 5,
      highlightEnabled: false,
      minScore: 0.65,
    };

    expect(prefs.literalLimit).toBe(25);
    expect(prefs.miniTextWindow).toBe(5);
    expect(prefs.highlightEnabled).toBe(false);
    expect(prefs.minScore).toBe(0.65);
  });
});
