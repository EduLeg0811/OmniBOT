import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MAX_CONTEXT_RECENT_TURNS,
  MAX_STORED_THREADS,
  clearAllThreads,
  createThread,
  ensureThread,
  loadThreads,
  saveThreads,
  trimMessagesForContext,
  upsertThread,
  type ChatThread,
} from "@/lib/chat-store";

describe("chat-store - trimMessagesForContext", () => {
  it("tem 5 como padrão de turnos recentes", () => {
    expect(MAX_CONTEXT_RECENT_TURNS).toBe(5);
  });

  it("retorna lista vazia para entradas vazias ou nulas", () => {
    expect(trimMessagesForContext([])).toEqual([]);
    expect(trimMessagesForContext(null as unknown as [])).toEqual([]);
  });

  it("não poda quando o número de turnos de usuário for menor ou igual a 5", () => {
    const turns = [
      { role: "user", text: "Pergunta 1" },
      { role: "assistant", text: "Resposta 1" },
      { role: "user", text: "Pergunta 2" },
      { role: "assistant", text: "Resposta 2" },
      { role: "user", text: "Pergunta 3" },
      { role: "assistant", text: "Resposta 3" },
      { role: "user", text: "Pergunta 4" },
      { role: "assistant", text: "Resposta 4" },
      { role: "user", text: "Pergunta 5" },
    ];

    const result = trimMessagesForContext(turns);
    expect(result).toEqual(turns);
    expect(result.length).toBe(9);
  });

  it("mantém todos os turnos intactos quando houver exatamente 6 turnos (1 âncora + 5 recentes)", () => {
    const turns = [
      { role: "user", text: "Pergunta 1" },
      { role: "assistant", text: "Resposta 1" },
      { role: "user", text: "Pergunta 2" },
      { role: "assistant", text: "Resposta 2" },
      { role: "user", text: "Pergunta 3" },
      { role: "assistant", text: "Resposta 3" },
      { role: "user", text: "Pergunta 4" },
      { role: "assistant", text: "Resposta 4" },
      { role: "user", text: "Pergunta 5" },
      { role: "assistant", text: "Resposta 5" },
      { role: "user", text: "Pergunta 6" },
    ];

    const result = trimMessagesForContext(turns, 5);
    expect(result).toEqual(turns);
    expect(result.length).toBe(11);
  });

  it("aplica Âncora (Turno 1) + Últimos 5 turnos a partir do 7º turno", () => {
    const turns = [
      { role: "user", text: "Pergunta 1 (Âncora)" },
      { role: "assistant", text: "Resposta 1 (Âncora)" },
      { role: "user", text: "Pergunta 2 (Omitida)" },
      { role: "assistant", text: "Resposta 2 (Omitida)" },
      { role: "user", text: "Pergunta 3 (Recente)" },
      { role: "assistant", text: "Resposta 3 (Recente)" },
      { role: "user", text: "Pergunta 4 (Recente)" },
      { role: "assistant", text: "Resposta 4 (Recente)" },
      { role: "user", text: "Pergunta 5 (Recente)" },
      { role: "assistant", text: "Resposta 5 (Recente)" },
      { role: "user", text: "Pergunta 6 (Recente)" },
      { role: "assistant", text: "Resposta 6 (Recente)" },
      { role: "user", text: "Pergunta 7 (Recente atual)" },
    ];

    const result = trimMessagesForContext(turns, 5);

    // Turno 1 mantido
    expect(result[0]).toEqual({ role: "user", text: "Pergunta 1 (Âncora)" });
    expect(result[1]).toEqual({ role: "assistant", text: "Resposta 1 (Âncora)" });

    // Turno 2 deve ter sido omitido
    expect(result.some((m) => m.text.includes("Pergunta 2"))).toBe(false);
    expect(result.some((m) => m.text.includes("Resposta 2"))).toBe(false);

    // Turnos 3 a 7 mantidos
    expect(result[2]).toEqual({ role: "user", text: "Pergunta 3 (Recente)" });
    expect(result.at(-1)).toEqual({ role: "user", text: "Pergunta 7 (Recente atual)" });

    // Total de mensagens: 2 da âncora + 9 dos últimos 5 turnos = 11 mensagens
    expect(result.length).toBe(11);

    // Alternância estrita de papéis
    result.forEach((m, idx) => {
      expect(m.role).toBe(idx % 2 === 0 ? "user" : "assistant");
    });
  });

  it("poda conversas longas mantendo estritamente a âncora e os últimos 5 turnos", () => {
    const turns: Array<{ role: "user" | "assistant"; text: string }> = [];
    for (let i = 1; i <= 20; i++) {
      turns.push({ role: "user", text: `Pergunta ${i}` });
      if (i < 20) {
        turns.push({ role: "assistant", text: `Resposta ${i}` });
      }
    }

    const result = trimMessagesForContext(turns, 5);

    // Total de mensagens esperadas:
    // Âncora: Pergunta 1 + Resposta 1 (2 mensagens)
    // Recentes: Perguntas 16..20 e Respostas 16..19 (9 mensagens)
    // Total = 11 mensagens
    expect(result.length).toBe(11);
    expect(result[0]?.text).toBe("Pergunta 1");
    expect(result[1]?.text).toBe("Resposta 1");
    expect(result[2]?.text).toBe("Pergunta 16");
    expect(result.at(-1)?.text).toBe("Pergunta 20");
  });
});

describe("chat-store - persistência e limite de 20 conversas", () => {
  const store = new Map<string, string>();
  const originalWindow = globalThis.window;

  beforeEach(() => {
    store.clear();
    const fakeLocalStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };

    (globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeLocalStorage,
    };
    clearAllThreads();
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  it("define MAX_STORED_THREADS como 20", () => {
    expect(MAX_STORED_THREADS).toBe(20);
  });

  it("salva e carrega mantendo no máximo 20 conversas ordenadas por updatedAt", () => {
    const mockThreads: ChatThread[] = [];
    const now = Date.now();

    for (let i = 0; i < 25; i++) {
      const thread = createThread();
      thread.id = `t-${i}`;
      thread.title = `Conversa ${i}`;
      thread.updatedAt = now + i * 1000;
      mockThreads.push(thread);
    }

    saveThreads(mockThreads);
    const loaded = loadThreads();

    expect(loaded.length).toBe(20);
    // A mais recente deve ser a primeira (Conversa 24)
    expect(loaded[0]?.id).toBe("t-24");
    // As mais antigas (t-0 a t-4) devem ter sido descartadas
    expect(loaded.some((t) => t.id === "t-0")).toBe(false);
    expect(loaded.some((t) => t.id === "t-4")).toBe(false);
    expect(loaded.at(-1)?.id).toBe("t-5");
  });

  it("upsertThread limita o resultado a 20 conversas", () => {
    const existing: ChatThread[] = [];
    const now = Date.now();

    for (let i = 0; i < 20; i++) {
      const thread = createThread();
      thread.id = `t-${i}`;
      thread.updatedAt = now + i * 1000;
      existing.push(thread);
    }

    const newThread = createThread();
    newThread.id = "t-new";
    newThread.updatedAt = now + 99999;

    const result = upsertThread(existing, newThread);
    expect(result.length).toBe(20);
    expect(result[0]?.id).toBe("t-new");
    expect(result.some((t) => t.id === "t-0")).toBe(false);
  });

  it("ensureThread não ultrapassa 20 conversas", () => {
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      const thread = createThread();
      thread.id = `t-${i}`;
      thread.updatedAt = now + i * 1000;
      saveThreads([thread, ...loadThreads()]);
    }

    const { threads } = ensureThread("t-brand-new");
    expect(threads.length).toBe(20);
    expect(threads.some((t) => t.id === "t-brand-new")).toBe(true);
  });
});
