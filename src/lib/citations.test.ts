import { describe, expect, it } from "vitest";
import { stripCitations } from "./citations";

describe("stripCitations", () => {
  it("retorna texto original quando não há citações", () => {
    const text = "O estado vibracional é uma técnica energética da Conscienciologia.";
    expect(stripCitations(text)).toBe(text);
  });

  it("remove referências do tipo fileciteturn0file0turn0file2 isoladas", () => {
    const input = "O conceito conscienciológico fileciteturn0file0turn0file2 é fundamental.";
    expect(stripCitations(input)).toBe("O conceito conscienciológico é fundamental.");
  });

  it("remove referências do tipo fileciteturn0file0turn0file2 no fim da frase ajustando o ponto", () => {
    const input = "Esta é a definição precisa fileciteturn0file0turn0file2.";
    expect(stripCitations(input)).toBe("Esta é a definição precisa.");
  });

  it("remove referências antes de vírgula sem deixar espaço residual", () => {
    const input = "Segundo Waldo Vieira fileciteturn0file0turn0file2, a lucidez é essencial.";
    expect(stripCitations(input)).toBe("Segundo Waldo Vieira, a lucidez é essencial.");
  });

  it("remove referências grudadas em palavras", () => {
    const input = "Pesquisa parapsíquicafileciteturn0file0turn0file2 e autolucidez.";
    expect(stripCitations(input)).toBe("Pesquisa parapsíquica e autolucidez.");
  });

  it("remove referências com dois-pontos ou sublinhados: filecite:turn0file0", () => {
    const input = "Trecho citado filecite:turn0file0 com fonte.";
    expect(stripCitations(input)).toBe("Trecho citado com fonte.");
  });

  it("remove múltiplas referências consecutivas", () => {
    const input = "Conceito fileciteturn0file0turn0file2 fileciteturn1file0 importante.";
    expect(stripCitations(input)).toBe("Conceito importante.");
  });

  it("remove anotações de colchetes OpenAI 【4:0†source】", () => {
    const input = "De acordo com o verbete【4:0†source】, a cosmoconsciência é a expansão máxima.";
    expect(stripCitations(input)).toBe(
      "De acordo com o verbete, a cosmoconsciência é a expansão máxima.",
    );
  });

  it("remove anotações de colchetes OpenAI streaming sem fechar", () => {
    const input = "Texto em streaming【turn0file0";
    expect(stripCitations(input)).toBe("Texto em streaming");
  });

  it("remove citações entre colchetes padrão [turn0file0] e [filecite:...]", () => {
    const input = "Ponto importante [turn0file0] e outro ponto [filecite:turn1file0].";
    expect(stripCitations(input)).toBe("Ponto importante e outro ponto.");
  });

  it("preserva quebras de linha e estrutura de parágrafos", () => {
    const input =
      "# Título fileciteturn0file0turn0file2\n\nPrimeiro parágrafo fileciteturn0file0.\n\nSegundo parágrafo.";
    expect(stripCitations(input)).toBe(
      "# Título\n\nPrimeiro parágrafo.\n\nSegundo parágrafo.",
    );
  });

  it("preserva listas e marcadores markdown", () => {
    const input = "- Item 1 fileciteturn0file0\n- Item 2 fileciteturn1file1\n- Item 3";
    expect(stripCitations(input)).toBe("- Item 1\n- Item 2\n- Item 3");
  });

  it("lida com string vazia", () => {
    expect(stripCitations("")).toBe("");
  });
});

