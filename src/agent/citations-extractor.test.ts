import { describe, expect, it } from "vitest";
import {
  extractCitationActions,
  extractCitedBooks,
  extractCitedVerbetes,
} from "./citations-extractor";

describe("citations-extractor", () => {
  it("extrai título de verbete citado no texto entre asteriscos ou aspas", () => {
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

  it("extrai livro canônico citado e trecho entre aspas próximo", () => {
    const text = `
No tratado 700 Experimentos da Conscienciologia, o autor detalha a "decolagem lúcida" como fenômeno inicial.
`;
    const books = extractCitedBooks(text);
    expect(books.length).toBeGreaterThanOrEqual(1);
    const exp = books.find((b) => b.book.mainServerSourceId === "EXP");
    expect(exp).toBeDefined();
    expect(exp?.term).toBe("decolagem lúcida");
  });

  it("gera pills para Opção B (Cons-IA) por padrão", () => {
    const assistantText = `
O tema é aprofundado no verbete *Autolucidez* e na obra Projeciologia, especificamente quanto ao "estado vibracional".
`;
    const actions = extractCitationActions({
      assistantText,
      destination: "cons-ia",
    });

    const verbeteAction = actions.find((a) => a.id === "search_verbete");
    expect(verbeteAction).toBeDefined();
    expect(verbeteAction?.href).toContain("https://cons-ia.org/index_search_verb.html");
    expect(verbeteAction?.href).toContain("fields=titulo");
    expect(verbeteAction?.service).toBe("Cons-IA");

    const bookAction = actions.find((a) => a.id === "search_book");
    expect(bookAction).toBeDefined();
    expect(bookAction?.href).toContain("https://cons-ia.org/index_search_book.html");
    expect(bookAction?.href).toContain("books=PROJ");
    expect(bookAction?.service).toBe("Cons-IA");
  });

  it("gera pills para Opção A (ConsTECA) quando configurado", () => {
    const assistantText = `
Consulte o verbete *Autolucidez* e o Léxico de Ortopensatas.
`;
    const actions = extractCitationActions({
      assistantText,
      destination: "consteca",
    });

    const verbeteAction = actions.find((a) => a.id === "search_verbete");
    expect(verbeteAction).toBeDefined();
    expect(verbeteAction?.href).toBe(
      "/search?q=Autolucidez&sources=enciclopedia&type=literal",
    );
    expect(verbeteAction?.service).toBe("ConsTECA");

    const bookAction = actions.find((a) => a.id === "search_book");
    expect(bookAction).toBeDefined();
    expect(bookAction?.href).toContain("/search?q=");
    expect(bookAction?.href).toContain("sources=lo");
    expect(bookAction?.service).toBe("ConsTECA");
  });

  it("deduplica pills já existentes em existingActions", () => {
    const assistantText = "Consulte o verbete *Autolucidez*.";
    const existingHref = "https://cons-ia.org/index_search_verb.html?q=Autolucidez&fields=titulo";
    const actions = extractCitationActions({
      assistantText,
      destination: "cons-ia",
      existingActions: [{ id: "search_verbete", href: existingHref }],
    });
    expect(actions.find((a) => a.href === existingHref)).toBeUndefined();
  });
});

