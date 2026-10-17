import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { extractHighlightTerms, HighlightedCorpusText } from "./highlight";

describe("highlight - extractHighlightTerms", () => {
  it("ignora termos de ligação comuns em português (artigos, preposições, conjunções)", () => {
    const terms = extractHighlightTerms("o livro da vida e do homem com a mente");
    expect(terms).toEqual(["livro", "homem", "mente", "vida"]);
    expect(terms).not.toContain("o");
    expect(terms).not.toContain("da");
    expect(terms).not.toContain("e");
    expect(terms).not.toContain("do");
    expect(terms).not.toContain("com");
    expect(terms).not.toContain("a");
  });

  it("ignora operadores booleanos e de negação", () => {
    const terms = extractHighlightTerms("autopesquisa AND reciclagem NOT medo OU paz NÃO trauma");
    expect(terms).toEqual(["autopesquisa", "reciclagem", "trauma", "medo", "paz"]);
    expect(terms).not.toContain("and");
    expect(terms).not.toContain("not");
    expect(terms).not.toContain("ou");
    expect(terms).not.toContain("nao");
  });

  it("preserva frases exatas entre aspas e ignora frases que são apenas stopwords", () => {
    const terms = extractHighlightTerms('"reciclagem intraconsciencial" "de" "conscienciologia prática"');
    expect(terms).toEqual([
      "reciclagem intraconsciencial",
      "conscienciologia prática",
      "intraconsciencial",
      "conscienciologia",
      "reciclagem",
      "prática",
    ]);
    expect(terms).not.toContain("de");
  });
});

describe("highlight - HighlightedCorpusText", () => {
  it("marca a palavra inteira mesmo quando o match é apenas prefixo", () => {
    const html = renderToStaticMarkup(
      <HighlightedCorpusText highlight query="auto" text="A autopesquisa é fundamental." />,
    );
    expect(html).toContain("<mark");
    expect(html).toContain(">autopesquisa</mark>");
    expect(html).not.toContain(">auto</mark>pesquisa");
  });

  it("marca a palavra inteira quando o match está no meio da palavra", () => {
    const html = renderToStaticMarkup(
      <HighlightedCorpusText highlight query="conhec" text="Desenvolver o autoconhecimento lúcido." />,
    );
    expect(html).toContain(">autoconhecimento</mark>");
  });

  it("marca a palavra inteira quando o match é sufixo", () => {
    const html = renderToStaticMarkup(
      <HighlightedCorpusText highlight query="pesquisa" text="Prática de autopesquisa contínua." />,
    );
    expect(html).toContain(">autopesquisa</mark>");
  });

  it("respeita pontuações e delimitadores ao expandir a palavra", () => {
    const html = renderToStaticMarkup(
      <HighlightedCorpusText highlight query="lucidez" text="Estado de (hiperlucidez), com clareza." />,
    );
    expect(html).toContain("(<mark");
    expect(html).toContain(">hiperlucidez</mark>),");
  });

  it("não marca termos de ligação comuns presentes no texto", () => {
    const html = renderToStaticMarkup(
      <HighlightedCorpusText highlight query="estudo da vida" text="O estudo da vida humana." />,
    );
    expect(html).toContain(">estudo</mark>");
    expect(html).toContain(">vida</mark>");
    // 'da' não deve estar envolto em <mark>
    expect(html).not.toMatch(/<mark[^>]*>da<\/mark>/);
    expect(html).not.toMatch(/<mark[^>]*>humana<\/mark>/);
  });
});
