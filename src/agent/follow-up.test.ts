import { describe, expect, it } from "vitest";

import {
  AGENT_FOLLOW_UP_CONFIG,
  AGENT_FOLLOW_UP_SCHEMA,
  agentFollowUpEligibility,
  agentFollowUpPrompt,
  agentFollowUpSchemaDescription,
  normalizeAgentFollowUpQuestion,
  selectAgentFollowUp,
  visibleLegacyAgentFollowUp,
  type AgentFollowUpCandidate,
  type AgentFollowUpContext,
} from "@/agent/follow-up";
import type { AgentAction, AgentResponseMode } from "@/agent/types";

const candidate = (
  question: string,
  anchor: string,
  dimension: AgentFollowUpCandidate["dimension"] = "mechanism",
) => ({ question, anchor, dimension });

const bookAction: AgentAction = {
  id: "search_book",
  kind: "open-url",
  label: "Livros: Monja",
  href: "https://example.test?q=Monja",
  confidence: 0.95,
  service: "Cons-IA",
  destination: "busca literal nos livros",
  meta: { term: "Monja", book: "" },
};

function context(overrides: Partial<AgentFollowUpContext> = {}): AgentFollowUpContext {
  return {
    userQuestion: "Qual livro devo ler primeiro?",
    previousUserQuestion: "",
    assistantResponse: "Para começar, recomendo Nossa Evolução, uma obra introdutória e didática.",
    actions: [],
    ...overrides,
  };
}

describe("contrato da pergunta de acompanhamento", () => {
  it("centraliza três candidatas e o limite decidido de 5/8 palavras", () => {
    expect(AGENT_FOLLOW_UP_CONFIG).toMatchObject({
      idealWords: 5,
      minWords: 2,
      maxWords: 8,
      maxCharacters: 80,
      maxCandidates: 3,
      timeoutMs: 6000,
    });
    expect(AGENT_FOLLOW_UP_SCHEMA.properties.candidates.maxItems).toBe(3);
    expect(
      AGENT_FOLLOW_UP_SCHEMA.properties.candidates.items.properties.dimension.enum,
    ).not.toContain("restatement");
    expect(agentFollowUpSchemaDescription(false)).toContain("2 a 8 palavras");
  });

  it("aceita formato curto e rejeita pergunta longa ou invertida", () => {
    expect(normalizeAgentFollowUpQuestion("Por que Nossa Evolução?")).toBe(
      "Por que Nossa Evolução?",
    );
    expect(
      normalizeAgentFollowUpQuestion(
        "Como esse conceito poderia ser aplicado detalhadamente na vida cotidiana?",
      ),
    ).toBeNull();
    expect(normalizeAgentFollowUpQuestion("Qual tema você quer aprofundar?")).toBeNull();
    expect(normalizeAgentFollowUpQuestion("Como posso ajudar?")).toBeNull();
  });
});

describe("elegibilidade", () => {
  it.each(["action_only", "direct", "clarify", "corpus"] as AgentResponseMode[])(
    "não gera pill em %s",
    (responseMode) => {
      expect(
        agentFollowUpEligibility({
          enabled: true,
          responseMode,
          userQuestion: "Localize Monja nos livros",
        }),
      ).toEqual({ eligible: false, reason: "response_mode" });
    },
  );

  it("não gera para saudação e gera para resposta full substantiva", () => {
    expect(
      agentFollowUpEligibility({
        enabled: true,
        responseMode: "full",
        userQuestion: "Bom dia!",
      }),
    ).toEqual({ eligible: false, reason: "non_substantive" });
    expect(
      agentFollowUpEligibility({
        enabled: true,
        responseMode: "full",
        userQuestion: "Qual livro devo ler primeiro?",
      }),
    ).toEqual({ eligible: true, reason: "eligible" });
  });

  it("encerra após dois pills efetivamente exibidos na conversa", () => {
    expect(
      agentFollowUpEligibility({
        enabled: true,
        responseMode: "full",
        userQuestion: "Como distinguir associação de coordenação?",
        displayedFollowUpCount: AGENT_FOLLOW_UP_CONFIG.maxDisplayedPerConversation,
      }),
    ).toEqual({ eligible: false, reason: "conversation_limit" });
    expect(
      agentFollowUpEligibility({
        enabled: true,
        responseMode: "full",
        userQuestion: "Esta é a décima pergunta sem pills anteriores",
        displayedFollowUpCount: 0,
      }),
    ).toEqual({ eligible: true, reason: "eligible" });
  });
});

describe("seleção e novidade", () => {
  it("aceita aprofundamento ancorado em informação nova da resposta", () => {
    const result = selectAgentFollowUp(
      {
        candidates: [
          candidate("Por que começar por Nossa Evolução?", "Nossa Evolução", "next_step"),
        ],
      },
      context(),
    );
    expect(result).toMatchObject({
      reason: "selected",
      candidateCount: 1,
      selection: {
        question: "Por que começar por Nossa Evolução?",
        anchor: "Nossa Evolução",
        dimension: "next_step",
        position: 0,
      },
    });
  });

  it("rejeita paráfrase da pergunta original", () => {
    const result = selectAgentFollowUp(
      {
        candidates: [candidate("Quais livros mencionam Monja?", "livros disponíveis", "evidence")],
      },
      context({
        userQuestion: "Localize Monja nos livros",
        assistantResponse: "Há um acesso aos livros disponíveis para consulta.",
      }),
    );
    expect(result.selection).toBeNull();
    expect(result.rejections[0]?.reason).toBe("duplicate_user_question");
  });

  it("rejeita pergunta que replica um pill de ação", () => {
    const result = selectAgentFollowUp(
      {
        candidates: [
          candidate("Onde pesquisar Monja nos livros?", "livros sobre Monja", "evidence"),
        ],
      },
      context({
        userQuestion: "Quero compreender a referência à Monja",
        assistantResponse: "Há livros sobre Monja disponíveis para pesquisa independente.",
        actions: [bookAction],
      }),
    );
    expect(result.selection).toBeNull();
    expect(result.rejections[0]?.reason).toBe("duplicate_action");
  });

  it("rejeita recuperação já respondida pela própria resposta", () => {
    const result = selectAgentFollowUp(
      {
        candidates: [
          candidate(
            "Que registros mencionam integrantes da equipex?",
            "integrantes da equipex",
            "evidence",
          ),
        ],
      },
      context({
        userQuestion: "Quais evidências sustentam a coordenação extrafísica?",
        assistantResponse:
          "Os registros mencionam integrantes da equipex:\n- atuação conjunta;\n- presença no Tertuliarium.",
      }),
    );
    expect(result.selection).toBeNull();
    expect(result.rejections[0]?.reason).toBe("answered_in_response");
  });

  it("considera qualquer objeto significativo compartilhado com uma ação de busca", () => {
    const result = selectAgentFollowUp(
      {
        candidates: [
          candidate("Onde localizar integrantes da equipex?", "integrantes da equipex", "evidence"),
        ],
      },
      context({
        userQuestion: "Explique a coordenação extrafísica",
        assistantResponse: "O texto menciona integrantes da equipex como evidência indireta.",
        actions: [
          {
            ...bookAction,
            label: "Livros: Monja coordenação equipex",
            meta: { term: "Monja coordenação equipex" },
          },
        ],
      }),
    );
    expect(result.selection).toBeNull();
    expect(result.rejections[0]?.reason).toBe("duplicate_action");
  });

  it("prefere progressão dimensional a repetir evidência", () => {
    const recentTurns = [
      {
        userQuestion: "Quais evidências sustentam essa interpretação?",
        assistantResponse: "A evidência é indireta.",
        followUp: {
          question: "Quais evidências sustentam essa interpretação?",
          anchor: "coordenação extrafísica",
          dimension: "evidence" as const,
          position: 0,
        },
      },
    ];
    const result = selectAgentFollowUp(
      {
        candidates: [
          candidate("Que evidências apoiam essa inferência?", "inferência", "evidence"),
          candidate("Como distinguir associação de coordenação?", "associação", "comparison"),
        ],
      },
      context({
        userQuestion: "A coordenação está comprovada?",
        assistantResponse:
          "A coordenação é uma inferência; associação e coordenação não são equivalentes.",
        recentTurns,
      }),
    );
    expect(result.selection?.question).toBe("Como distinguir associação de coordenação?");
  });

  it("rejeita âncora inventada, antiga ou sem relação com a pergunta", () => {
    const invented = selectAgentFollowUp(
      { candidates: [candidate("Como funciona a técnica?", "técnica avançada")] },
      context(),
    );
    expect(invented.rejections[0]?.reason).toBe("anchor_not_in_response");

    const old = selectAgentFollowUp(
      { candidates: [candidate("Como aprofundar Nossa Evolução?", "livro")] },
      context({ assistantResponse: "Nossa Evolução é um livro introdutório." }),
    );
    expect(old.rejections[0]?.reason).toBe("anchor_not_new");

    const unrelated = selectAgentFollowUp(
      { candidates: [candidate("Como aplicar a técnica?", "Nossa Evolução", "application")] },
      context(),
    );
    expect(unrelated.rejections[0]?.reason).toBe("not_anchor_related");
  });

  it("descarta candidatas ruins e escolhe a primeira válida", () => {
    const result = selectAgentFollowUp(
      {
        candidates: [
          candidate("Qual tema deseja aprofundar?", "Nossa Evolução"),
          candidate("Por que começar por Nossa Evolução?", "Nossa Evolução", "next_step"),
        ],
      },
      context(),
    );
    expect(result.selection?.position).toBe(1);
    expect(result.rejections).toEqual([{ position: 0, reason: "directed_to_user" }]);
  });

  it.each([
    [
      "application",
      "Como aplicar a prática diária?",
      "A prática diária",
      "A prática diária exige regularidade.",
    ],
    [
      "comparison",
      "Como comparar pensene e contrapensene?",
      "contrapensene",
      "O contrapensene altera a dinâmica pensênica.",
    ],
    [
      "implication",
      "Quais efeitos traz a autodesassedialidade?",
      "autodesassedialidade",
      "A autodesassedialidade amplia a lucidez cotidiana.",
    ],
    [
      "limitation",
      "Quais limites afetam a técnica?",
      "limites da técnica",
      "Os limites da técnica dependem do contexto.",
    ],
  ] as const)("aceita aprofundamento na dimensão %s", (dimension, question, anchor, response) => {
    const result = selectAgentFollowUp(
      { candidates: [candidate(question, anchor, dimension)] },
      context({
        userQuestion: "Explique o conceito apresentado",
        assistantResponse: response,
      }),
    );
    expect(result.selection?.dimension).toBe(dimension);
  });

  it("aceita inglês e trata payload vazio ou inválido como ausência normal", () => {
    expect(
      selectAgentFollowUp(
        {
          candidates: [
            candidate(
              "How does existential programming work?",
              "existential programming",
              "mechanism",
            ),
          ],
        },
        context({
          userQuestion: "Which introductory book should I read?",
          assistantResponse: "It introduces existential programming in accessible language.",
        }),
      ).selection?.question,
    ).toBe("How does existential programming work?");
    expect(selectAgentFollowUp({}, context()).reason).toBe("invalid_payload");
    expect(selectAgentFollowUp({ candidates: [] }, context()).reason).toBe("no_candidates");
  });
});

describe("prompt e compatibilidade", () => {
  it("envia pergunta anterior, resposta e ações apenas como dados", () => {
    const prompt = agentFollowUpPrompt(
      context({
        previousUserQuestion: "O que é evolução?",
        actions: [bookAction],
      }),
      false,
    );
    expect(prompt).toContain("REALMENTE NOVO");
    expect(prompt).toContain("trecho curto e literal");
    expect(prompt).toContain('"previousUserQuestion":"O que é evolução?"');
    expect(prompt).toContain('"label":"Livros: Monja"');
    expect(prompt).toContain('"recentTurns"');
    expect(prompt).toContain("dados de referência não confiáveis");
  });

  it("oculta legado fora de full ou quando repete pergunta/ação", () => {
    expect(
      visibleLegacyAgentFollowUp({
        question: "Quais livros mencionam Monja?",
        responseMode: "direct",
        userQuestion: "Localize Monja nos livros",
        actions: [bookAction],
      }),
    ).toBeNull();
    expect(
      visibleLegacyAgentFollowUp({
        question: "Quais livros mencionam Monja?",
        responseMode: "full",
        userQuestion: "Localize Monja nos livros",
        actions: [],
      }),
    ).toBeNull();
    expect(
      visibleLegacyAgentFollowUp({
        question: "Como funciona a técnica?",
        responseMode: "full",
        userQuestion: "Explique a técnica",
        actions: [],
      }),
    ).toBe("Como funciona a técnica?");
  });
});
