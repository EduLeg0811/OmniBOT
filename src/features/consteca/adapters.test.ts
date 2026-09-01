import { describe, expect, it } from "vitest";

import {
  adaptLiteralResponse,
  adaptSemanticResponse,
  mergeSourceCatalog,
} from "@/features/consteca/adapters";
import { extractHighlightTerms } from "@/features/consteca/highlight";

const catalog = mergeSourceCatalog(
  {
    sources: [
      {
        id: "LO",
        indexId: "lo",
        label: "Léxico de Ortopensatas",
        fileStem: "LO",
        recordCount: 25_187,
      },
      {
        id: "EC",
        indexId: "ec",
        label: "Enciclopédia da Conscienciologia",
        fileStem: "EC",
        recordCount: 6_541,
      },
    ],
  },
  {
    indexes: [
      { id: "lo", label: "LO" },
      { id: "dac", label: "DAC", sourceRows: 4_804 },
    ],
  },
);

describe("ConsTECA adapters", () => {
  it("combina catálogos lexical e semântico por id canônico", () => {
    expect(catalog.find((source) => source.id === "lo")).toMatchObject({
      code: "LO",
      lexicalAvailable: true,
      semanticAvailable: true,
      recordCount: 25_187,
    });
    expect(catalog.find((source) => source.id === "dac")).toMatchObject({
      lexicalAvailable: false,
      semanticAvailable: true,
    });
    expect(catalog.find((source) => source.id === "ec")).toMatchObject({
      lexicalAvailable: true,
      semanticAvailable: false,
    });
  });

  it("normaliza resultados semânticos, metadados e ranking", () => {
    const result = adaptSemanticResponse(
      {
        query: "autopesquisa",
        totalFound: 8,
        durationMs: 42,
        rateLimit: { count: 2, remaining: 48 },
        failedSources: [{ sourceId: "dac", detail: "indisponível" }],
        results: [
          { id: "LO-2", sourceId: "lo", text: "B", score: 0.7, metadata: {} },
          {
            id: "LO-1",
            sourceId: "lo",
            title: "Autopesquisa",
            page: "12",
            paragraph: 8,
            text: "A",
            score: 0.9,
            metadata: { author: "Autor" },
          },
        ],
      },
      catalog,
    );

    expect(result.kind).toBe("smart");
    expect(result.results.map((item) => item.id)).toEqual(["LO-1", "LO-2"]);
    expect(result.results[0]?.metadata.author).toBe("Autor");
    expect(result.groups[0]).toMatchObject({ sourceId: "lo", shownCount: 2, topScore: 0.9 });
    expect(result.rateLimit?.remaining).toBe(48);
    expect(result.failures).toHaveLength(1);
  });

  it("normaliza grupos literais e remove duplicatas do mesmo parágrafo", () => {
    const result = adaptLiteralResponse(
      {
        term: "reciclagem",
        totalFound: 4,
        groups: [
          {
            bookCode: "LO",
            bookLabel: "Léxico de Ortopensatas",
            totalFound: 4,
            matches: [
              {
                row: 10,
                number: 10,
                title: "Reciclagem",
                text: "Trecho",
                pagina: "20",
                data: { area: "Reciclologia" },
              },
              { row: 10, number: 10, title: "Reciclagem", text: "Trecho", pagina: "20", data: {} },
            ],
          },
        ],
      },
      catalog,
      15,
    );

    expect(result.kind).toBe("literal");
    expect(result.results).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ totalFound: 4, shownCount: 1 });
    expect(result.results[0]?.metadata.area).toBe("Reciclologia");
  });

  it("extrai termos para highlight ignorando operadores e preservando frases", () => {
    expect(
      extractHighlightTerms('"reciclagem intraconsciencial" AND autopesquisa NÃO medo'),
    ).toEqual([
      "reciclagem intraconsciencial",
      "intraconsciencial",
      "autopesquisa",
      "reciclagem",
      "medo",
    ]);
  });
});
