import { afterEach, describe, expect, it, vi } from "vitest";

import { planAgent } from "@/agent/planner/plan";
import type { AgentContext } from "@/agent/types";

function context(userText: string): AgentContext {
  return {
    userText,
    settings: { enabled: true, prompt: "", presentation: "citations" },
    host: {
      apiBase: "http://main-server.test",
      english: false,
      vectorStoreId: "CONSTECA",
      logEvent: () => undefined,
    },
    semanticSourceIds: ["lo", "dac"],
    hasFileSearch: true,
    threadId: "thread-1",
  };
}

function classifierResponse(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: JSON.stringify(payload) }))),
  );
}

describe("agent planner", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("encaminha saudações para Luna, sem regra local", async () => {
    classifierResponse({
      actions: [],
      route: "direct",
      confidence: 0.99,
      reason: "simple_greeting",
      answer: "Olá! Como posso ajudar?",
    });

    await expect(planAgent(context("bom dia"))).resolves.toMatchObject({
      route: "direct",
      actions: [],
      answer: "Olá! Como posso ajudar?",
      origin: "luna",
      confidence: 0.99,
    });
  });

  it("preserva a resposta completa quando há ação complementar", async () => {
    classifierResponse({
      actions: [{ intent: "search_book", term: "Monja", field: "", book: "" }],
      route: "full",
      confidence: 0.99,
      reason: "complementary_search",
      answer: "",
    });

    await expect(planAgent(context("onde procuro Monja?"))).resolves.toMatchObject({
      route: "full",
      answer: "",
      actions: [{ id: "search_book" }],
    });
  });

  it("mantém a rota corpus sem ações externas", async () => {
    classifierResponse({
      actions: [{ intent: "search_book", term: "Monja", field: "", book: "" }],
      route: "corpus",
      confidence: 0.99,
      reason: "literal_search",
      answer: "",
    });

    await expect(planAgent(context("busque Monja no corpus"))).resolves.toMatchObject({
      route: "corpus",
      actions: [],
      answer: "Os trechos relevantes do corpus estão apresentados abaixo.",
    });
  });

  it("faz fallback ao modelo principal quando o classificador é inválido", async () => {
    classifierResponse({ actions: [], route: "unexpected", answer: "" });

    await expect(planAgent(context("explique a cosmoética"))).resolves.toMatchObject({
      route: "full",
      actions: [],
      answer: "",
    });
  });

  it("converte corpus em pills externos no modo Clássico", async () => {
    classifierResponse({
      actions: [{ intent: "search_book", term: "Monja", field: "", book: "" }],
      route: "corpus",
      confidence: 0.99,
      reason: "literal_search",
      answer: "",
    });

    await expect(
      planAgent({
        ...context("busque Monja no corpus clássico"),
        settings: { enabled: true, prompt: "", presentation: "classic" },
      }),
    ).resolves.toMatchObject({
      route: "direct",
      answer: "Clique nos botões abaixo para expandir sua pesquisa.",
      actions: [{ id: "search_book" }],
    });
  });

  it("faz fallback completo quando Clássico recebe corpus sem ação externa", async () => {
    classifierResponse({
      actions: [],
      route: "corpus",
      confidence: 0.99,
      reason: "literal_search",
      answer: "",
    });

    await expect(
      planAgent({
        ...context("busca genérica no corpus clássico"),
        settings: { enabled: true, prompt: "", presentation: "classic" },
      }),
    ).resolves.toMatchObject({ route: "full", actions: [], answer: "" });
  });

  it("rebaixa corpus de confiança média para resposta completa", async () => {
    classifierResponse({
      actions: [{ intent: "search_book", term: "cosmoética", field: "", book: "" }],
      route: "corpus",
      confidence: 0.65,
      reason: "possible_search",
      answer: "",
    });

    await expect(planAgent(context("procure cosmoética nas fontes"))).resolves.toMatchObject({
      route: "full",
      actions: [{ id: "search_book" }],
      proposedRoute: "corpus",
      reason: "corpus_requires_high_confidence",
    });
  });

  it("mantém esclarecimento objetivo quando Luna o justificar", async () => {
    classifierResponse({
      actions: [],
      route: "clarify",
      confidence: 0.7,
      reason: "missing_source_scope",
      answer: "Você quer pesquisar em livros ou em verbetes?",
    });

    await expect(planAgent(context("procure isso"))).resolves.toMatchObject({
      route: "clarify",
      answer: "Você quer pesquisar em livros ou em verbetes?",
    });
  });

  it("faz fallback quando a confiança é baixa", async () => {
    classifierResponse({
      actions: [],
      route: "direct",
      confidence: 0.2,
      reason: "uncertain",
      answer: "Talvez.",
    });

    await expect(planAgent(context("isso"))).resolves.toMatchObject({
      route: "full",
      reason: "low_confidence",
      proposedRoute: "direct",
    });
  });

  it("trata confiança ausente como resposta inválida", async () => {
    classifierResponse({
      actions: [{ intent: "search_book", term: "tenepes", field: "", book: "" }],
      route: "direct",
      reason: "literal_search",
      answer: "",
    });

    await expect(planAgent(context("busque tenepes"))).resolves.toMatchObject({
      route: "full",
      actions: [],
      confidence: 0,
      reason: "invalid_confidence",
      proposedRoute: "direct",
      origin: "fallback",
    });
  });

  it("mantém links contextuais na rota full", async () => {
    classifierResponse({
      actions: [
        { intent: "encyclossapiens", term: "", field: "", book: "" },
        { intent: "acervo_icge", term: "", field: "", book: "" },
      ],
      route: "full",
      confidence: 0.94,
      reason: "contextual_resources",
      answer: "",
    });

    await expect(
      planAgent(context("Explique as regras e indique o acervo histórico")),
    ).resolves.toMatchObject({
      route: "full",
      actions: [
        { id: "encyclossapiens", href: "https://encyclossapiens.org/kit-verbetografo/" },
        { id: "acervo_icge", href: "https://www.icge.org.br/" },
      ],
      origin: "luna",
    });
  });

  it("deixa Luna decidir a lista de fontes", async () => {
    classifierResponse({
      actions: [{ intent: "list_sources", term: "", field: "", book: "" }],
      route: "direct",
      confidence: 0.98,
      reason: "list_loaded_sources",
      answer: "",
    });

    await expect(
      planAgent(context("Quais fontes de consulta você possui?")),
    ).resolves.toMatchObject({
      route: "direct",
      actions: [{ id: "list_sources" }],
      origin: "luna",
      answer: "As fontes de consulta atualmente carregadas estão listadas abaixo.",
    });
  });
});
