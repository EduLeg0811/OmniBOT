import { describe, expect, it } from "vitest";
import {
  matchDeterministicActions,
  PERIODICOS_PATTERN_PT,
  PERIODICOS_PATTERN_EN,
  LIVROS_PDF_PATTERN_PT,
  LIVROS_PDF_PATTERN_EN,
} from "./rules";
import type { AgentContext } from "@/agent/types";

function mockContext(userText: string, english = false): AgentContext {
  return {
    userText,
    semanticSourceIds: ["LO"],
    hasFileSearch: true,
    settings: { enabled: true, prompt: "", presentation: "classic", followUpSuggestions: true },
    host: {
      apiBase: "http://test",
      english,
      vectorStoreId: "base",
      logEvent: () => undefined,
    },
    threadId: "test-thread",
  };
}

describe("Regras determinísticas para inclusão de Pills (Módulo Agent)", () => {
  describe("Padrões de Periódicos e Artigos de revistas", () => {
    it.each([
      "onde acho artigos da revista conscientia?",
      "tem periódicos da conscienciologia?",
      "como consultar artigos científicos?",
      "onde leio a revista Conscientia?",
      "gostaria de pesquisar artigos sobre tenepes",
      "procuro um artigo sobre invexis",
    ])("reconhece pedido de artigos em português: %s", (query) => {
      expect(PERIODICOS_PATTERN_PT.test(query)).toBe(true);
      const actions = matchDeterministicActions(mockContext(query));
      expect(actions).toHaveLength(1);
      expect(actions[0]!.href).toBe("https://periodicos.conscienciologia.org.br/");
      expect(actions[0]!.label).toBe("Periódicos");
    });

    it.each([
      "where can I read scientific articles on conscientiology?",
      "are there journals available?",
      "search conscientia journal articles",
    ])("reconhece pedido de artigos em inglês: %s", (query) => {
      expect(PERIODICOS_PATTERN_EN.test(query)).toBe(true);
      const actions = matchDeterministicActions(mockContext(query, true));
      expect(actions).toHaveLength(1);
      expect(actions[0]!.href).toBe("https://periodicos.conscienciologia.org.br/");
    });
  });

  describe("Padrões de Livros em PDF e Obras completas no Google Drive", () => {
    it.each([
      "onde encontro o livro Projeciologia em PDF?",
      "como baixar os livros em PDF?",
      "onde está o link do google drive com os livros completos?",
      "onde acho as obras em pdf para download?",
      "como faço o download do tratado em pdf?",
      "tem pasta no google drive para baixar livros?",
    ])("reconhece pedido de download de livros em português: %s", (query) => {
      expect(LIVROS_PDF_PATTERN_PT.test(query)).toBe(true);
      const actions = matchDeterministicActions(mockContext(query));
      expect(actions).toHaveLength(1);
      expect(actions[0]!.href).toBe(
        "https://drive.google.com/drive/u/2/folders/1Mp6Zfhq-peIYlo9Js0wYRX2DnRjFYyUj",
      );
      expect(actions[0]!.label).toBe("Livros em PDF");
    });

    it.each([
      "where can I download books in PDF?",
      "is there a google drive folder for complete works in pdf?",
      "download projectiology pdf book",
    ])("reconhece pedido de download de livros em inglês: %s", (query) => {
      expect(LIVROS_PDF_PATTERN_EN.test(query)).toBe(true);
      const actions = matchDeterministicActions(mockContext(query, true));
      expect(actions).toHaveLength(1);
      expect(actions[0]!.href).toBe(
        "https://drive.google.com/drive/u/2/folders/1Mp6Zfhq-peIYlo9Js0wYRX2DnRjFYyUj",
      );
    });
  });

  describe("Não interfere em consultas que não citam periódicos ou pdfs", () => {
    it.each([
      "o que é tenepes?",
      "qual a diferença entre psicossoma e mentalsoma?",
      "quem foi Waldo Vieira?",
    ])("não gera ações para consultas não pertinentes: %s", (query) => {
      const actions = matchDeterministicActions(mockContext(query));
      expect(actions).toHaveLength(0);
    });
  });
});
