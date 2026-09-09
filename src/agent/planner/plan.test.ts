import { describe, expect, it } from "vitest";
import {
  CCCI_DESTINATIONS,
  isBlockedCcciUrl,
  isIcgeVerbetotecaUrl,
  isSearchVerbeteUrl,
} from "@/agent/config";
import {
  buildAgentResponseContext,
  normalizePlannerPayload,
  type PlannerPayload,
} from "@/agent/planner/plan";
import { actionsFromMatches, withoutRepeatedActions } from "@/agent/tools/registry";
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
const defaults = { field: "texto", book: "", area: "raiz", section: "", resource: "", style: "" };
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

describe("normalização do planejador Agent v3", () => {
  it.each(["full", "direct", "corpus"])("normaliza %s", (mode) => {
    const answer = mode === "full" ? "" : "Resposta curta.";
    const plan = normalizePlannerPayload(payload(mode, 0.95, [], answer), context("citations"));
    expect(plan.responseMode).toBe(mode);
  });

  it("um pill nunca substitui a resposta", () => {
    const plan = normalizePlannerPayload(
      payload("full", 0.98, [action("catalogo_ccci", "", 0.92, { area: "memoria" })]),
      context(),
    );
    expect(plan).toMatchObject({ responseMode: "full", route: "full", answer: "" });
    expect(plan.actions[0]).toMatchObject({ id: "catalogo_ccci", label: "Memória CCCI" });
  });

  it("confiança baixa do modo não suprime mais a resposta, e a ação fraca continua filtrada", () => {
    const plan = normalizePlannerPayload(
      payload("full", 0.4, [
        action("search_book", "tenepes", 0.8),
        action("search_verbete", "tenepes", 0.4),
      ]),
      context(),
    );
    expect(plan.responseMode).toBe("full");
    expect(plan.actions.map((item) => item.id)).toEqual(["search_book"]);
  });

  it("ordena por confiança antes de cortar em três ações", () => {
    const plan = normalizePlannerPayload(
      payload("full", 0.9, [
        action("search_book", "tenepes", 0.6),
        action("bibliomancia", "", 0.7),
        action("search_verbete", "tenepes", 0.95),
        action("search_conscienciograma", "tenepes", 0.8),
      ]),
      context(),
    );
    expect(plan.actions.map((item) => item.id)).toEqual([
      "search_verbete",
      "search_conscienciograma",
      "bibliomancia",
    ]);
  });

  it("direct sem resposta volta ao caminho completo", () => {
    const plan = normalizePlannerPayload(payload("direct", 0.9, [], ""), context());
    expect(plan).toMatchObject({ responseMode: "full", reason: "missing_direct_answer" });
  });

  it("no Clássico corpus sempre vira full, preservando a ação", () => {
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

  it("corta o termo longo em vez de anular a ação", () => {
    const plan = normalizePlannerPayload(
      payload("full", 0.99, [
        action("search_book", "Programa de Aceleração da Desperticidade do Conselho de epicons"),
      ]),
      context(),
    );
    expect(plan.actions).toHaveLength(1);
    expect((plan.actions[0]!.meta?.term ?? "").split(/\s+/)).toHaveLength(6);
    expect(plan.reason).toContain("termo_cortado");
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

describe("catálogo de destinos da CCCI", () => {
  it("todo destino gera pill com URL válida e rótulo do próprio destino", () => {
    for (const destination of CCCI_DESTINATIONS) {
      const [result] = actionsFromMatches(
        [{ intent: "catalogo_ccci", term: "", confidence: 1, area: destination.id }],
        context(),
      );
      expect(result, destination.id).toBeDefined();
      expect(() => new URL(result!.href)).not.toThrow();
      expect(result!.href).toBe(destination.url);
      expect(result!.label).toBe(destination.label);
    }
  });

  it("nenhum destino do catálogo cai na blacklist", () => {
    for (const destination of CCCI_DESTINATIONS) {
      expect(isBlockedCcciUrl(destination.url), destination.id).toBe(false);
    }
  });

  it("as páginas vetadas são reconhecidas e as demais não", () => {
    for (const pageId of [4006, 6051, 1385]) {
      expect(isBlockedCcciUrl(`https://www.icge.org.br/?page_id=${pageId}`)).toBe(true);
    }
    expect(isBlockedCcciUrl("https://www.icge.org.br/?page_id=6611")).toBe(false);
    expect(isBlockedCcciUrl("https://editares.org/")).toBe(false);
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

  it("resolve a obra escrita por extenso em term, e não abre bibliografia vazia", () => {
    const [result] = actionsFromMatches(
      [
        {
          intent: "bibliografia_livros",
          term: "Léxico de Ortopensatas 2019",
          confidence: 1,
          style: "bee",
        },
      ],
      context(),
    );
    expect(result!.href).toContain("sigla=LO");
    expect(result!.href).toContain("style=bee");
    expect(result!.label).toContain("Léxico de Ortopensatas");
  });

  it("abre a seção pedida da Encyclossapiens", () => {
    const section = (value: string) =>
      actionsFromMatches(
        [{ intent: "encyclossapiens", term: "", confidence: 1, section: value }],
        context(),
      )[0]!.href;
    expect(section("kit")).toContain("kit-verbetografo");
    expect(section("enciclopedia")).toContain("/ec/");
    expect(section("pesquisa")).toContain("autoverbetografia");
  });
});

describe("repetição de pills na conversa", () => {
  const pill = (term: string) =>
    actionsFromMatches([{ intent: "search_verbete", term, confidence: 1 }], context())[0]!;

  it("suprime o mesmo par ferramenta+termo, ignorando caixa e acento", () => {
    expect(withoutRepeatedActions([pill("Tenepes")], [pill("tenepes")])).toHaveLength(0);
  });

  it("mantém termo diferente na mesma ferramenta", () => {
    expect(withoutRepeatedActions([pill("proéxis")], [pill("tenepes")])).toHaveLength(1);
  });
});

describe("regra pontual: Verbetoteca do ICGE (?page_id=13493) vs busca de verbetes", () => {
  it("reconhece URLs da Verbetoteca do ICGE e de busca de verbetes", () => {
    expect(isIcgeVerbetotecaUrl("https://www.icge.org.br/?page_id=13493")).toBe(true);
    expect(isIcgeVerbetotecaUrl("http://icge.org.br/?page_id=13493&foo=bar")).toBe(true);
    expect(isIcgeVerbetotecaUrl("https://www.icge.org.br/?page_id=9973")).toBe(false);

    expect(isSearchVerbeteUrl("https://cons-ia.org/index_search_verb.html")).toBe(true);
    expect(isSearchVerbeteUrl("https://cons-ia.org/index_search_verb.html?q=tenepes&field=texto")).toBe(true);
    expect(isSearchVerbeteUrl("https://cons-ia.org/index_search_book.html")).toBe(false);
  });

  it("nunca sugere Verbetoteca do ICGE e search_verbete ao mesmo tempo, preferindo search_verbete", () => {
    const matches: AgentMatch[] = [
      { intent: "catalogo_ccci", term: "", confidence: 0.98, area: "verbetoteca" },
      { intent: "search_verbete", term: "autopesquisa", confidence: 0.90, field: "texto" },
    ];
    const actions = actionsFromMatches(matches, context());
    expect(actions).toHaveLength(1);
    expect(actions[0]!.id).toBe("search_verbete");
    expect(actions[0]!.href).toContain("index_search_verb.html");
    expect(actions[0]!.href).not.toContain("13493");
    expect(actions.some((a) => isIcgeVerbetotecaUrl(a.href))).toBe(false);
  });

  it("preserva outra ação válida no lugar da Verbetoteca descartada", () => {
    const matches: AgentMatch[] = [
      { intent: "catalogo_ccci", term: "", confidence: 0.98, area: "verbetoteca" },
      { intent: "search_verbete", term: "tenepes", confidence: 0.95 },
      { intent: "search_book", term: "tenepes", confidence: 0.90 },
    ];
    const actions = actionsFromMatches(matches, context());
    expect(actions).toHaveLength(2);
    expect(actions.map((a) => a.id)).toEqual(["search_verbete", "search_book"]);
    expect(actions.some((a) => isIcgeVerbetotecaUrl(a.href))).toBe(false);
  });

  it("permite Verbetoteca do ICGE quando search_verbete não está presente", () => {
    const matches: AgentMatch[] = [
      { intent: "catalogo_ccci", term: "", confidence: 0.95, area: "verbetoteca" },
    ];
    const actions = actionsFromMatches(matches, context());
    expect(actions).toHaveLength(1);
    expect(actions[0]!.id).toBe("catalogo_ccci");
    expect(actions[0]!.href).toBe("https://www.icge.org.br/?page_id=13493");
  });

  it("permite até MAX_AGENT_ACTIONS = 3 ações simultâneas", () => {
    const matches: AgentMatch[] = [
      { intent: "search_verbete", term: "tenepes", confidence: 0.95 },
      { intent: "search_book", term: "tenepes", confidence: 0.90 },
      { intent: "consulta_lexicons", term: "tenepes", confidence: 0.85 },
      { intent: "search_conscienciograma", term: "tenepes", confidence: 0.80 },
    ];
    const actions = actionsFromMatches(matches, context());
    expect(actions).toHaveLength(3);
    expect(actions.map((a) => a.id)).toEqual([
      "search_verbete",
      "search_book",
      "consulta_lexicons",
    ]);
  });
});


