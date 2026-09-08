import { describe, expect, it } from "vitest";
import {
  buildAgentResponseContext,
  normalizePlannerPayload,
  type PlannerPayload,
} from "@/agent/planner/plan";
import { actionsFromMatches } from "@/agent/tools/registry";
import type { AgentContext, AgentMatch } from "@/agent/types";

function context(presentation: "classic" | "citations" = "classic"): AgentContext {
  return {
    userText: "pergunta",
    semanticSourceIds: ["LO"],
    hasFileSearch: true,
    settings: { enabled: true, prompt: "", presentation, followUpSuggestions: true },
    host: {
      apiBase: "http://test",
      english: false,
      vectorStoreId: "base",
      logEvent: () => undefined,
    },
    threadId: "thread",
  };
}
const defaults = { field: "texto", book: "", area: "", resource: "", style: "" };
const action = (intent: string, term = "", confidence = 0.9, extra = {}) => ({
  intent,
  term,
  confidence,
  ...defaults,
  ...extra,
});
const payload = (
  responseMode: string,
  responseConfidence = 0.9,
  actions: unknown[] = [],
  answer = "",
): PlannerPayload => ({
  responseMode,
  responseConfidence,
  actions,
  answer,
  reason: "test",
});

describe("normalização do planejador Agent v2", () => {
  it.each(["full", "action_only", "direct", "clarify", "corpus"])("normaliza %s", (mode) => {
    const actions = mode === "action_only" ? [action("bibliomancia")] : [];
    const answer = ["action_only", "direct", "clarify", "corpus"].includes(mode)
      ? "Resposta curta."
      : "";
    const plan = normalizePlannerPayload(
      payload(mode, 0.95, actions, answer),
      context("citations"),
    );
    expect(plan.responseMode).toBe(mode);
  });
  it("não suprime pergunta substantiva que também tem ação", () => {
    const plan = normalizePlannerPayload(
      payload("full", 0.98, [action("icge", "", 0.92, { area: "memoria" })]),
      context(),
    );
    expect(plan).toMatchObject({ responseMode: "full", route: "full", answer: "" });
    expect(plan.actions[0]).toMatchObject({ id: "icge", destination: "Memória CCCI" });
  });
  it("rebaixa action_only de confiança média, preservando o pill", () => {
    const plan = normalizePlannerPayload(
      payload("action_only", 0.7, [action("search_book", "tenepes")], "Preparada."),
      context(),
    );
    expect(plan).toMatchObject({
      responseMode: "full",
      reason: "action_only_requires_high_confidence",
    });
    expect(plan.actions).toHaveLength(1);
  });
  it("força full abaixo de 0,55 e preserva somente ação confiável", () => {
    const plan = normalizePlannerPayload(
      payload("direct", 0.4, [
        action("search_book", "tenepes", 0.8),
        action("search_verbete", "tenepes", 0.4),
      ]),
      context(),
    );
    expect(plan).toMatchObject({ responseMode: "full", reason: "low_confidence" });
    expect(plan.actions.map((item) => item.id)).toEqual(["search_book"]);
  });
  it("exige alta confiança para clarify", () => {
    expect(
      normalizePlannerPayload(payload("clarify", 0.7, [], "Qual obra?"), context()).responseMode,
    ).toBe("full");
    expect(
      normalizePlannerPayload(payload("clarify", 0.9, [], "Qual obra?"), context()).responseMode,
    ).toBe("clarify");
  });
  it("no Clássico corpus sempre vira full, sem virar direct", () => {
    const plan = normalizePlannerPayload(
      payload("corpus", 0.99, [action("search_book", "tenepes")], "Trechos."),
      context("classic"),
    );
    expect(plan).toMatchObject({
      responseMode: "full",
      route: "full",
      reason: "classic_corpus_to_full",
    });
    expect(plan.actions).toHaveLength(1);
  });
  it("action_only sem ação válida vira full", () => {
    expect(
      normalizePlannerPayload(
        payload("action_only", 0.99, [action("search_book", "", 0.9)], "Abra."),
        context(),
      ).responseMode,
    ).toBe("full");
  });
  it("substitui introdução com alegação de resultado por texto neutro do catálogo", () => {
    const plan = normalizePlannerPayload(
      payload("action_only", 0.99, [action("search_book", "tenepes")], "Encontrei 12 resultados."),
      context(),
    );
    expect(plan.answer).toContain("está preparada");
    expect(plan.answer).not.toMatch(/encontrei|12/i);
  });
  it("substitui introdução longa por texto neutro do catálogo", () => {
    const plan = normalizePlannerPayload(
      payload("action_only", 0.99, [action("bibliomancia")], "x".repeat(400)),
      context(),
    );
    expect(plan.answer).toContain("sorteio");
    expect(plan.answer.length).toBeLessThan(200);
  });
  it("gera contexto confiável para a resposta principal", () => {
    const plan = normalizePlannerPayload(
      payload("full", 0.99, [action("search_verbete", "tenepes", 0.9, { field: "titulo" })]),
      context(),
    );
    const prompt = buildAgentResponseContext(plan, false);
    expect(prompt).toContain("ainda não consultado");
    expect(prompt).toContain("não afirme inexistência");
  });
});

describe("URLs e parâmetros", () => {
  it("usa book_code canônico, field e LexiCons em Cosmovisão", () => {
    const matches: AgentMatch[] = [
      { intent: "search_book", term: "tenepes", confidence: 1, book: "EXP" },
      { intent: "consulta_lexicons", term: "altruísmo", confidence: 1 },
    ];
    const result = actionsFromMatches(matches, context());
    expect(result[0]!.href).toContain("books=EXP");
    expect(result[1]!.href).toContain("q=altru%C3%ADsmo");
    expect(result[1]!.href).toContain("autostart=1");
    expect(result[1]!.href).not.toContain("mode=");
  });
  it("mapeia as oito macroáreas oficiais do ICGE", () => {
    const areas = [
      "agenda",
      "instituicoes",
      "publicacoes",
      "enciclopedia",
      "memoria",
      "videos",
      "autopesquisa",
      "holociclo",
    ];
    for (const area of areas) {
      const [result] = actionsFromMatches(
        [{ intent: "icge", term: "", confidence: 1, area }],
        context(),
      );
      expect(result!.href).toMatch(/^https:\/\/www\.icge\.org\.br\/\?page_id=\d+$/);
    }
  });
  it("constrói verbetes, CCG, bibliografias, Bibliomancia e recurso explícito", () => {
    const cases: AgentMatch[] = [
      { intent: "search_verbete", term: "Vieira", confidence: 1, field: "autor" },
      { intent: "search_conscienciograma", term: "liderança", confidence: 1 },
      {
        intent: "bibliografia_livros",
        term: "Projeciologia",
        confidence: 1,
        book: "PROJ",
        style: "bee",
      },
      { intent: "bibliomancia", term: "", confidence: 1 },
      { intent: "open_resource", term: "", confidence: 1, resource: "periodicos" },
    ];
    const hrefs = cases.map((item) => actionsFromMatches([item], context())[0]!.href);
    expect(hrefs[0]).toContain("field=autor");
    expect(hrefs[1]).toContain("index_search_ccg.html");
    expect(hrefs[2]).toContain("sigla=PROJ");
    expect(hrefs[2]).toContain("style=bee");
    expect(hrefs[3]).toContain("autostart=1");
    expect(hrefs[4]).toContain("periodicos.conscienciologia.org.br");
  });
});
