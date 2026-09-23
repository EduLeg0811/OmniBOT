import { describe, expect, it } from "vitest";
import {
  matchDeterministicActions,
  matchDeterministicRules,
  UPLOAD_PATTERN_PT,
  GRAPHIC_PATTERN_PT,
  PERIODICOS_PATTERN_PT,
  LIVROS_PDF_PATTERN_PT,
  SCOPE_PATTERN_PT,
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

describe("Regras determinísticas do Módulo Agent", () => {
  describe("Restrição de upload de arquivo", () => {
    it.each([
      "posso subir um arquivo PDF?",
      "como faço upload de arquivo?",
      "dá para anexar arquivo para você analisar?",
      "enviar documento pdf",
    ])("reconhece pedido de upload: %s", (query) => {
      expect(UPLOAD_PATTERN_PT.test(query)).toBe(true);
      const triage = matchDeterministicRules(mockContext(query));
      expect(triage).not.toBeNull();
      expect(triage!.mode).toBe("direct");
      expect(triage!.answer).toContain("não realiza upload de arquivos");
    });
  });

  describe("Restrição de geração de figuras e diagramas gráficos", () => {
    it.each([
      "gere uma figura da escala evolutiva",
      "crie um diagrama gráfico sobre pensene",
      "desenhe um mapa conceitual visual",
      "você faz desenho ou imagem?",
      "gerar diagrama do holossoma",
    ])("reconhece pedido de geração gráfica: %s", (query) => {
      expect(GRAPHIC_PATTERN_PT.test(query)).toBe(true);
      const triage = matchDeterministicRules(mockContext(query));
      expect(triage).not.toBeNull();
      expect(triage!.mode).toBe("direct");
      expect(triage!.answer).toContain("opera exclusivamente em modo textual e não gera figuras");
    });
  });

  describe("Restrição de escopo documental", () => {
    it.each([
      "você tem outros livros além de Waldo Vieira?",
      "o acervo tem livros de outros autores?",
      "você tem artigos de revistas no chat?",
    ])("reconhece pergunta sobre escopo de terceiros: %s", (query) => {
      expect(SCOPE_PATTERN_PT.test(query)).toBe(true);
      const triage = matchDeterministicRules(mockContext(query));
      expect(triage).not.toBeNull();
      expect(triage!.mode).toBe("direct");
      expect(triage!.answer).toContain("exclusivamente as obras de autoria de Waldo Vieira");
      expect(triage!.answer).toContain("Enciclopédia da Conscienciologia");
    });
  });

  describe("Pill e direcionamento para Periódicos", () => {
    it.each([
      "onde acho artigos da revista conscientia?",
      "tem periódicos da conscienciologia?",
      "como consultar artigos científicos?",
      "onde leio a revista Conscientia?",
    ])("dispara pill de Periódicos em pergunta direta: %s", (query) => {
      expect(PERIODICOS_PATTERN_PT.test(query)).toBe(true);
      const triage = matchDeterministicRules(mockContext(query));
      expect(triage).not.toBeNull();
      expect(triage!.mode).toBe("direct");
      expect(triage!.actions).toHaveLength(1);
      expect(triage!.actions[0]!.href).toBe("https://periodicos.conscienciologia.org.br/");
      expect(triage!.actions[0]!.label).toBe("Periódicos");
    });
  });

  describe("Pill e direcionamento para Livros em PDF (Google Drive)", () => {
    it.each([
      "onde encontro o livro Projeciologia em PDF?",
      "como baixar os livros em PDF?",
      "onde está o link do google drive com os livros completos?",
      "onde acho as obras em pdf para download?",
    ])("dispara pill de Livros em PDF em pergunta direta: %s", (query) => {
      expect(LIVROS_PDF_PATTERN_PT.test(query)).toBe(true);
      const triage = matchDeterministicRules(mockContext(query));
      expect(triage).not.toBeNull();
      expect(triage!.mode).toBe("direct");
      expect(triage!.actions).toHaveLength(1);
      expect(triage!.actions[0]!.href).toBe(
        "https://drive.google.com/drive/u/2/folders/1Mp6Zfhq-peIYlo9Js0wYRX2DnRjFYyUj",
      );
      expect(triage!.actions[0]!.label).toBe("Livros em PDF");
    });
  });

  describe("Perguntas conceituais amplas não são interceptadas como direct", () => {
    it.each([
      "o que é tenepes e onde acho artigos da revista sobre isso?",
      "explique a diferença entre psicossoma e mentalsoma e cite artigos científicos",
      "defina proéxis e como baixar o manual em pdf",
    ])("não força direct para pergunta conceitual ampla: %s", (query) => {
      const triage = matchDeterministicRules(mockContext(query));
      expect(triage).toBeNull();

      // Mas as ações determinísticas ainda são extraídas
      const actions = matchDeterministicActions(mockContext(query));
      expect(actions.length).toBeGreaterThan(0);
    });
  });
});
