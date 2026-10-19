import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildClassifierRequest,
  buildDirectorRequest,
  ROUTE_QUESTIONS,
} from "@/agent/planner/decisions";
import { directAgent, type AgentTriage } from "@/agent/planner/triage";
import type { AgentAction, AgentContext } from "@/agent/types";

function context(userText = "Busque o termo tenepes"): AgentContext {
  return {
    userText,
    semanticSourceIds: ["LO"],
    hasFileSearch: true,
    settings: { enabled: true, prompt: "", presentation: "classic", followUpSuggestions: true },
    host: {
      apiBase: "http://test",
      english: false,
      vectorStoreId: "base",
      logEvent: () => undefined,
    },
    threadId: "thread",
  };
}

const triage = (extra: Partial<AgentTriage> = {}): AgentTriage => ({
  mode: "full",
  responseMode: "full",
  answer: "",
  answerOrigin: "none",
  actions: [],
  confidence: 0.9,
  responseConfidence: 0.9,
  reason: "test",
  origin: "luna",
  engine: "decisions",
  decisionAnswers: [
    {
      type: "choice",
      name: "forma",
      choice: "busca_literal",
      confidence: 0.9,
      probabilities: [{ value: "busca_literal", probability: 0.95 }],
    },
  ],
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe("Classificador e Direcionador", () => {
  it("o Classificador pergunta só a rota e o Direcionador só os pills", () => {
    const classifier = buildClassifierRequest(context()).questions.map((q) => q.name);
    const director = buildDirectorRequest(context()).questions.map((q) => q.name);
    expect(classifier.every((name) => ROUTE_QUESTIONS.has(name))).toBe(true);
    expect(classifier).toContain("forma");
    expect(director.some((name) => ROUTE_QUESTIONS.has(name))).toBe(false);
    expect(director).toContain("busca_termo");
    expect(buildClassifierRequest(context()).promptCacheKey).not.toBe(
      buildDirectorRequest(context()).promptCacheKey,
    );
  });

  it("turno direto não chama o Direcionador", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const direction = await directAgent(
      context(),
      triage({ responseMode: "direct", mode: "direct" }),
    );
    expect(direction).toEqual({ actions: [], reason: "direct_turn" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("o Direcionador interpreta os pills junto com a forma decidida pelo Classificador", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        answers: [
          { type: "predicate", name: "busca_termo", probability: 0.9 },
          {
            type: "choice",
            name: "escopo_busca",
            choice: "livros",
            confidence: 0.9,
            probabilities: [{ value: "livros", probability: 0.9 }],
          },
          {
            type: "choice",
            name: "termo",
            choice: "tenepes",
            confidence: 0.9,
            probabilities: [
              { value: "", probability: 0.05 },
              { value: "tenepes", probability: 0.95 },
            ],
          },
          // O destino mais provável perderia a disputa, mas a forma do turno
          // (busca_literal, vinda do Classificador) dá a vez à busca.
          {
            type: "choice",
            name: "destino_livros",
            choice: "livros_catalogo",
            confidence: 0.9,
            probabilities: [
              { value: "nenhum", probability: 0.02 },
              { value: "livros_catalogo", probability: 0.98 },
            ],
          },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetch);
    const direction = await directAgent(context(), triage());
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.action).toBe("direct");
    expect(direction.actions.map((a) => a.id)).toEqual(["search_book"]);
  });

  it("Direcionador indisponível deixa só os pills determinísticos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 502, text: async () => "" })),
    );
    const direction = await directAgent(
      context("onde acho artigos da revista conscientia?"),
      triage(),
    );
    expect(direction.reason).toBe("director_unavailable");
    expect(direction.actions.map((a) => a.meta?.resource)).toEqual(["periodicos"]);
  });

  it("no fallback pela Responses API, os pills já vieram na chamada única", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const action = { id: "bibliomancia", href: "https://cons-ia.org/x" } as AgentAction;
    const direction = await directAgent(
      context("sorteie uma ortopensata"),
      triage({ engine: "responses", actions: [action] }),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(direction.actions.map((a) => a.id)).toEqual(["bibliomancia"]);
  });
});
