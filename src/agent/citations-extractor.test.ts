import { describe, expect, it } from "vitest";
import {
  extractCitationActions,
  extractCitedVerbetes,
  extractSubstantiveBookCitations,
} from "./citations-extractor";

describe("citations-extractor (estratégia de relevância e não-redundância)", () => {
  it("extrai título de verbete citado explicitamente", () => {
    const text =
      "Conforme analisado no verbete *Autolucidez*, a consciência lúcida mantém foco continuado.";
    const verbetes = extractCitedVerbetes(text);
    expect(verbetes).toContain("Autolucidez");
  });

  it("extrai título de verbete em seção de referências", () => {
    const text = `
# Referências
1. VIEIRA, Waldo. *Pensene*. In: Enciclopédia da Conscienciologia. Foz do Iguaçu: Editares, 2013.
2. VIEIRA, Waldo. *Cosmoética*. In: Enciclopédia da Conscienciologia.
`;
    const verbetes = extractCitedVerbetes(text);
    expect(verbetes).toContain("Pensene");
    expect(verbetes).toContain("Cosmoética");
  });

  it("NÃO gera pill para livro apenas por menção casual do nome sem citação textual", () => {
    const text =
      "Waldo Vieira tratou deste princípio ao longo de sua obra, incluindo 700 Experimentos e Projeciologia.";
    const citations = extractSubstantiveBookCitations(text);
    // Sem aspas ou capítulo/experimento, não deve gerar citação substantiva
    expect(citations).toHaveLength(0);

    const actions = extractCitationActions({
      assistantText: text,
      userQuestion: "O que é holossoma?",
    });
    // Não deve indicar pills apenas por obrigação!
    expect(actions).toHaveLength(0);
  });

  it("gera pill para livro quando houver citação textual substantiva entre aspas", () => {
    const text = `
No tratado 700 Experimentos da Conscienciologia, o autor define o fenômeno como "decolagem lúcida assistida", essencial no desenvolvimento.
`;
    const citations = extractSubstantiveBookCitations(text);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.book.mainServerSourceId).toBe("EXP");
    expect(citations[0]?.quotedSnippet).toBe("decolagem lúcida assistida");

    const actions = extractCitationActions({
      assistantText: text,
      destination: "cons-ia",
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toContain('700 Exp.: "decolagem lúcida assistida"');
    expect(actions[0]?.href).toContain("books=EXP");
    expect(actions[0]?.href).toMatch(/q=decolagem(?:\+|%20)l%C3%BAcida(?:\+|%20)assistida/);
  });

  it("gera pill para livro com capítulo/experimento específico", () => {
    const text =
      "Conforme detalhado no livro Projeciologia (capítulo 120), a exteriorização de energias...";
    const citations = extractSubstantiveBookCitations(text);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.quotedSnippet).toBe("capítulo 120");
  });

  it("evita redundância quando o verbete é a própria pergunta do usuário e já tem ação planejada", () => {
    const text = "O verbete *Pensene* define a unidade de manifestação consciencial.";
    const actions = extractCitationActions({
      assistantText: text,
      userQuestion: "O que é pensene?",
      existingActions: [
        {
          id: "search_verbete",
          href: "https://cons-ia.org/index_search_verb.html?q=pensene",
          meta: { term: "pensene" },
        },
      ],
    });
    // Já existe pill para pensene no turno, não duplica
    expect(actions).toHaveLength(0);
  });

  it("permite sugerir novo verbete relevante e complementar que difere da pergunta", () => {
    const text =
      "Sobre a tenepes, vale pesquisar o verbete *Ofiex*, que aprofunda a interface interassistencial.";
    const actions = extractCitationActions({
      assistantText: text,
      userQuestion: "Como começar a praticar tenepes?",
      existingActions: [
        {
          id: "search_verbete",
          href: "https://cons-ia.org/index_search_verb.html?q=tenepes",
          meta: { term: "tenepes" },
        },
      ],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe("Verbete: Ofiex");
  });

  it("limita rigorosamente a no máximo 2 pills por turno para não poluir", () => {
    const text = `
No verbete *Autolucidez* e no verbete *Cosmoética*, além do verbete *Macrossoma* e do verbete *Desperticidade*, há vasta fundamentação.
`;
    const actions = extractCitationActions({
      assistantText: text,
      userQuestion: "Conceitos fundamentais",
    });
    expect(actions.length).toBeLessThanOrEqual(2);
  });
});
