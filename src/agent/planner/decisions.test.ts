import { describe, expect, it } from "vitest";
import {
  buildDecisionRequest,
  planFromDecisions,
  termCandidates,
  type DecisionAnswer,
} from "@/agent/planner/decisions";
import type { AgentContext } from "@/agent/types";

function context(
  userText = "pergunta",
  presentation: "classic" | "citations" = "classic",
  english = false,
): AgentContext {
  return {
    userText,
    semanticSourceIds: ["LO"],
    hasFileSearch: true,
    settings: { enabled: true, prompt: "", presentation, followUpSuggestions: true },
    host: { apiBase: "http://test", english, vectorStoreId: "base", logEvent: () => undefined },
    threadId: "thread",
  };
}

const predicate = (name: string, probability: number): DecisionAnswer => ({
  type: "predicate",
  name,
  probability,
});
const choice = (name: string, probabilities: Record<string, number>): DecisionAnswer => {
  const entries = Object.entries(probabilities);
  const [value] = entries.reduce((best, item) => (item[1] > best[1] ? item : best));
  return {
    type: "choice",
    name,
    choice: value,
    confidence: 0.5,
    probabilities: entries.map(([v, p]) => ({ value: v, probability: p })),
  };
};
const shape = (value: string, p = 0.9) => choice("forma", { [value]: p, outro: 1 - p });
const none = {
  obra: choice("obra", { nenhum: 0.95, TEAT: 0.05 }),
  ccci: choice("destino_institucional", { nenhum: 0.9, memoria: 0.1 }),
  recurso: choice("recurso", { nenhum: 0.9, periodicos: 0.1 }),
  encyclo: choice("encyclossapiens", { nenhum: 0.9, kit: 0.1 }),
};
const quiet = [none.obra, none.ccci, none.recurso, none.encyclo];

describe("candidatos a termo", () => {
  it("põe o termo entre aspas primeiro e descarta palavras do pedido nas pontas", () => {
    const candidates = termCandidates("buscar a expressão “dupla evolutiva” nos livros");
    expect(candidates[0]).toBe("dupla evolutiva");
    expect(candidates).not.toContain("buscar");
    expect(candidates).not.toContain("livros");
    expect(candidates).not.toContain("expressão dupla");
  });

  it("mantém preposição no meio de um conceito composto", () => {
    expect(termCandidates("Busque Programa de Aceleração da Desperticidade")).toContain(
      "Programa de Aceleração da Desperticidade",
    );
  });

  it("preserva a grafia do usuário", () => {
    expect(termCandidates("localize tudo sobre a Monja")).toContain("Monja");
  });

  it("na continuação elíptica traz o termo da pergunta anterior", () => {
    expect(termCandidates("e nos verbetes?", "busque tenepes nos livros")).toContain("tenepes");
  });

  it("numa colagem longa só usa as pontas, nunca o meio do bloco", () => {
    const block = Array.from({ length: 200 }, (_, i) => `palavra${i}`).join(" ");
    const candidates = termCandidates(`Revise o texto abaixo: ${block} obrigado`);
    expect(candidates).not.toContain("palavra100");
    expect(candidates).toContain("palavra199");
  });

  it("respeita o limite de 254 opções", () => {
    const long = Array.from({ length: 59 }, (_, i) => `conceito${i}x`).join(" ");
    expect(termCandidates(long).length).toBeLessThanOrEqual(254);
  });
});

describe("questionário", () => {
  it("respeita os limites documentados e não repete nomes nem valores", () => {
    const request = buildDecisionRequest(context("Busque o termo tenepes"));
    expect(request.questions.length).toBeGreaterThan(0);
    expect(request.questions.length).toBeLessThanOrEqual(200);
    const names = request.questions.map((q) => q.name);
    expect(new Set(names).size).toBe(names.length);
    for (const question of request.questions) {
      if (question.type !== "choice") continue;
      expect(question.choices.length, question.name).toBeGreaterThanOrEqual(2);
      expect(question.choices.length, question.name).toBeLessThanOrEqual(255);
      const values = question.choices.map((c) => c.value);
      expect(new Set(values).size, question.name).toBe(values.length);
    }
    expect(request.promptCacheKey.length).toBeLessThanOrEqual(64);
  });

  it("só pergunta por trechos brutos em Citações", () => {
    const names = (presentation: "classic" | "citations") =>
      buildDecisionRequest(context("tenepes", presentation)).questions.map((q) => q.name);
    expect(names("classic")).not.toContain("trechos_brutos");
    expect(names("citations")).toContain("trechos_brutos");
  });

  it("as regras vão como developer e a mensagem como user", () => {
    const request = buildDecisionRequest(context("o que é tenepes?"));
    expect(request.input.map((m) => m.role)).toEqual(["developer", "user"]);
    expect(request.input[1]!.content).toContain("o que é tenepes?");
  });
});

describe("interpretação das respostas", () => {
  it("busca de termo sem escopo gera livros e verbetes juntos, com probabilidade real", () => {
    const plan = planFromDecisions(
      [
        shape("busca_literal"),
        predicate("busca_termo", 0.93),
        choice("escopo_busca", { ambos: 0.8, livros: 0.15, verbetes: 0.05 }),
        choice("campo_verbete", { texto: 0.9, titulo: 0.1 }),
        choice("termo", { "": 0.02, tenepes: 0.95, "termo tenepes": 0.03 }),
        ...quiet,
      ],
      context("Busque o termo tenepes"),
    );
    expect(plan.responseMode).toBe("full");
    expect(plan.actions.map((a) => a.id).sort()).toEqual(["search_book", "search_verbete"]);
    expect(plan.actions[0]!.confidence).toBe(0.93);
    expect(plan.actions.every((a) => a.meta?.term === "tenepes")).toBe(true);
    expect(plan.reason).toContain("forma=busca_literal");
  });

  it("obra nomeada restringe a busca aos livros e vai no parâmetro", () => {
    const plan = planFromDecisions(
      [
        shape("busca_literal"),
        predicate("busca_termo", 0.9),
        choice("escopo_busca", { ambos: 0.6, livros: 0.4 }),
        choice("obra", { nenhum: 0.05, PROJ: 0.95 }),
        choice("termo", { "": 0.1, tenepes: 0.9 }),
        none.ccci,
        none.recurso,
        none.encyclo,
      ],
      context("Buscar a tenepes no livro Projeciologia"),
    );
    expect(plan.actions.map((a) => a.id)).toEqual(["search_book"]);
    expect(plan.actions[0]!.href).toContain("books=PROJ");
  });

  it("ação que exige termo sem candidato não vira pill", () => {
    const plan = planFromDecisions(
      [shape("busca_literal"), predicate("busca_termo", 0.9), ...quiet],
      context("busque"),
    );
    expect(plan.actions).toEqual([]);
  });

  it("pergunta conceitual fica sem ação", () => {
    const plan = planFromDecisions(
      [
        shape("pergunta", 0.95),
        predicate("busca_termo", 0.1),
        predicate("lexicons", 0.2),
        ...quiet,
      ],
      context("Como iniciar a prática da tenepes?"),
    );
    expect(plan).toMatchObject({ responseMode: "full", answer: "", actions: [] });
  });

  it("destino CCCI decide por 1 − P(nenhum), mesmo com a massa espalhada", () => {
    const plan = planFromDecisions(
      [
        shape("pergunta"),
        choice("destino_institucional", { nenhum: 0.2, memoria: 0.45, busca_video: 0.35 }),
        none.obra,
        none.recurso,
        none.encyclo,
      ],
      context("Onde encontro o arquivo histórico e os vídeos da CCCI?"),
    );
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      id: "catalogo_ccci",
      label: "Imprensa e vídeos da CCCI",
      confidence: 0.8,
    });
  });

  describe("regra geral: destino do catálogo e busca disputam a necessidade", () => {
    const answers = (searchP: number, destinoP: number, forma = "pergunta") => [
      shape(forma),
      predicate("busca_termo", searchP),
      choice("escopo_busca", { ambos: 0.1, livros: 0.1, verbetes: 0.8 }),
      choice("termo", { "": 0.1, autopesquisa: 0.9 }),
      choice("destino_verbetes", { nenhum: 1 - destinoP, ranking_verbetografos: destinoP }),
    ];
    const ids = (plan: ReturnType<typeof planFromDecisions>) =>
      plan.actions.map((a) => a.id).sort();

    it("o destino mais provável vence a busca da mesma área", () => {
      expect(ids(planFromDecisions(answers(0.85, 0.98), context("x")))).toEqual(["catalogo_ccci"]);
    });
    it("a busca mais provável vence o destino da mesma área", () => {
      expect(ids(planFromDecisions(answers(0.97, 0.85), context("x")))).toEqual(["search_verbete"]);
    });
    it("pedido explícito de busca fica sempre com a busca", () => {
      expect(ids(planFromDecisions(answers(0.85, 0.98, "busca_literal"), context("x")))).toEqual([
        "search_verbete",
      ]);
    });
    it("a disputa vale em qualquer área: o destino de outra área também concorre", () => {
      const plan = planFromDecisions(
        [
          ...answers(0.9, 0).slice(0, 4),
          choice("destino_referencia", { nenhum: 0.19, especialidades: 0.81 }),
        ],
        context("x"),
      );
      expect(ids(plan)).toEqual(["search_verbete"]);
    });
  });

  it("nome de fonte nunca é termo de busca, salvo entre aspas", () => {
    expect(termCandidates("Quem mais escreveu verbetes na Enciclopédia?")).not.toContain(
      "Enciclopédia",
    );
    expect(termCandidates("Procure liderança no Conscienciograma")).toEqual(["liderança"]);
    expect(termCandidates("busque “Enciclopédia” nos livros")).toContain("Enciclopédia");
  });

  it("nunca usa a raiz do ICGE só para ter uma ação", () => {
    const plan = planFromDecisions(
      [shape("pergunta"), choice("destino_institucional", { nenhum: 0.1, raiz: 0.9 })],
      context("ICGE"),
    );
    expect(plan.actions).toEqual([]);
  });

  it("saudação inequívoca responde direto com texto de catálogo", () => {
    const plan = planFromDecisions([shape("saudacao", 0.9), ...quiet], context("Boa noite!"));
    expect(plan).toMatchObject({ responseMode: "direct", answerOrigin: "catalog" });
    expect(plan.answer).toMatch(/Olá/);
  });

  it("saudação incerta vai para o modelo principal", () => {
    const plan = planFromDecisions([shape("saudacao", 0.6), ...quiet], context("oi, e a tenepes?"));
    expect(plan.responseMode).toBe("full");
  });

  it("pergunta sobre o próprio bot vai para o modelo principal", () => {
    const plan = planFromDecisions([shape("meta_bot", 0.95), ...quiet], context("o que você faz?"));
    expect(plan).toMatchObject({ responseMode: "full", answer: "" });
  });

  it("fontes carregadas responde direto com a ação local", () => {
    const plan = planFromDecisions(
      [shape("fontes_carregadas", 0.9), predicate("lista_fontes", 0.9), ...quiet],
      context("Quais fontes estão carregadas?"),
    );
    expect(plan.responseMode).toBe("direct");
    expect(plan.actions.map((a) => a.id)).toEqual(["list_sources"]);
  });

  it("corpus só em Citações e só com pedido explícito de trechos brutos", () => {
    const answers = [shape("pergunta"), predicate("trechos_brutos", 0.9), ...quiet];
    expect(planFromDecisions(answers, context("x", "citations")).responseMode).toBe("corpus");
    expect(planFromDecisions(answers, context("x", "classic")).responseMode).toBe("full");
  });

  it("recusa numa pergunta não derruba as outras", () => {
    const plan = planFromDecisions(
      [
        shape("pergunta"),
        { type: "refusal", name: "termo" },
        choice("recurso", { nenhum: 0.1, periodicos: 0.9 }),
      ],
      context("artigos da revista conscientia"),
    );
    expect(plan.actions.map((a) => a.id)).toEqual(["open_resource"]);
    expect(plan.reason).toContain("recusas=termo");
  });

  it("bibliografia de livro aceita obra pelo parâmetro", () => {
    const plan = planFromDecisions(
      [
        shape("pergunta"),
        predicate("bibliografia_livro", 0.9),
        choice("obra", { nenhum: 0.1, LO: 0.9 }),
        choice("termo", { "": 0.6, "Léxico de Ortopensatas": 0.4 }),
        none.ccci,
        none.recurso,
        none.encyclo,
      ],
      context("Citar o Léxico de Ortopensatas."),
    );
    expect(plan.actions[0]!.href).toContain("sigla=LO");
  });
});
