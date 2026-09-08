const AGENT_MODE_DEFAULT: number = 1;
const agentModeOverride = String(import.meta.env.VITE_AGENT_MODE ?? "").trim();
export const AGENT_MODE = agentModeOverride
  ? agentModeOverride === "1"
  : import.meta.env.DEV || AGENT_MODE_DEFAULT === 1;

export const AGENT_INTENTS = [
  "search_book",
  "search_verbete",
  "search_conscienciograma",
  "bibliografia_livros",
  "bibliografia_verbetes",
  "consulta_lexicons",
  "bibliomancia",
  "encyclossapiens",
  "icge",
  "open_resource",
  "list_sources",
] as const;
export type AgentIntentId = (typeof AGENT_INTENTS)[number];

const envUrl = (key: string, fallback: string) =>
  String((import.meta.env as Record<string, unknown>)[key] || fallback)
    .trim()
    .replace(/[?&]+$/, "");

export const AGENT_TARGETS = {
  search_book: envUrl("VITE_SEARCH_BOOK_URL", "https://cons-ia.org/index_search_book.html"),
  search_verbete: envUrl("VITE_SEARCH_VERBETE_URL", "https://cons-ia.org/index_search_verb.html"),
  search_conscienciograma: envUrl(
    "VITE_SEARCH_CCG_URL",
    "https://cons-ia.org/index_search_ccg.html",
  ),
  bibliografia_livros: envUrl("VITE_BIBLIOGRAPHY_URL", "https://cons-ia.org/index_biblio_wv.html"),
  bibliografia_verbetes: envUrl(
    "VITE_BIBLIOGRAPHY_VERBETE_URL",
    "https://cons-ia.org/index_biblio_verbete.html",
  ),
  consulta_lexicons: envUrl("VITE_LEXICONS_URL", "https://lexicons.cons-ia.org/"),
  bibliomancia: envUrl("VITE_BIBLIOMANCIA_URL", "https://cons-ia.org/index_mancia.html"),
  encyclossapiens: envUrl(
    "VITE_ENCYCLOSSAPIENS_URL",
    "https://encyclossapiens.org/kit-verbetografo/",
  ),
  icge: envUrl("VITE_ICGE_URL", "https://www.icge.org.br/"),
  open_resource: "#",
  list_sources: "#",
} satisfies Record<AgentIntentId, string>;

export const AGENT_VERBETE_FIELDS = ["texto", "titulo", "autor", "especialidade"] as const;
export type AgentVerbeteField = (typeof AGENT_VERBETE_FIELDS)[number];
export const AGENT_ICGE_AREAS = [
  "",
  "agenda",
  "instituicoes",
  "publicacoes",
  "enciclopedia",
  "memoria",
  "videos",
  "autopesquisa",
  "holociclo",
] as const;
export const AGENT_RESOURCE_IDS = [
  "periodicos",
  "enciclopedia",
  "livros_pdf",
  "quiz",
  "flashcards",
  "consgpt",
  "conslm",
] as const;

export const AGENT_PLANNER_TIMEOUT_MS = 6000;
export const AGENT_CLASSIFIER_MODEL = "gpt-5.6-luna";
export const AGENT_CLASSIFIER_REASONING = { id: "none", label: "None" } as const;
export const AGENT_CONFIDENCE_HIGH = 0.78;
export const AGENT_CONFIDENCE_MEDIUM = 0.55;
export const AGENT_ANSWER_MAX = 320;

export type AgentBook = {
  mainServerSourceId: string;
  consIaSearchId: string;
  bibliographySigla: string;
  label: string;
  aliases: readonly string[];
};
export const AGENT_BOOKS: readonly AgentBook[] = [
  {
    mainServerSourceId: "TEAT",
    consIaSearchId: "TEAT",
    bibliographySigla: "TEAT",
    label: "200 Teáticas da Conscienciologia",
    aliases: ["200 teaticas", "200 teáticas"],
  },
  {
    mainServerSourceId: "EXP",
    consIaSearchId: "EXP",
    bibliographySigla: "EXP",
    label: "700 Experimentos da Conscienciologia",
    aliases: ["700 experimentos"],
  },
  {
    mainServerSourceId: "DAC",
    consIaSearchId: "DAC",
    bibliographySigla: "DAC",
    label: "Dicionário de Argumentos da Conscienciologia",
    aliases: ["dicionario de argumentos", "dicionário de argumentos"],
  },
  {
    mainServerSourceId: "HSP",
    consIaSearchId: "HSP",
    bibliographySigla: "HSP",
    label: "Homo sapiens pacificus",
    aliases: ["homo sapiens pacificus"],
  },
  {
    mainServerSourceId: "HSR",
    consIaSearchId: "HSR",
    bibliographySigla: "HSR",
    label: "Homo sapiens reurbanisatus",
    aliases: ["homo sapiens reurbanisatus"],
  },
  {
    mainServerSourceId: "LO",
    consIaSearchId: "LO",
    bibliographySigla: "LO",
    label: "Léxico de Ortopensatas",
    aliases: ["lexico de ortopensatas", "léxico de ortopensatas"],
  },
  {
    mainServerSourceId: "MDE",
    consIaSearchId: "MDE",
    bibliographySigla: "MDE",
    label: "Manual da Dupla Evolutiva",
    aliases: ["manual da dupla evolutiva"],
  },
  {
    mainServerSourceId: "MP",
    consIaSearchId: "MP",
    bibliographySigla: "MP",
    label: "Manual da Proéxis",
    aliases: ["manual da proexis", "manual da proéxis"],
  },
  {
    mainServerSourceId: "TNP",
    consIaSearchId: "TNP",
    bibliographySigla: "TNP",
    label: "Manual da Tenepes",
    aliases: ["manual da tenepes"],
  },
  {
    mainServerSourceId: "MINI_ARLINDO",
    consIaSearchId: "MINI_ARLINDO",
    bibliographySigla: "",
    label: "Minitertúlia — Arlindo",
    aliases: ["minitertulia arlindo", "minitertúlia arlindo"],
  },
  {
    mainServerSourceId: "PROJ1986",
    consIaSearchId: "PROJ1986",
    bibliographySigla: "",
    label: "Projeciologia (1986)",
    aliases: ["projeciologia 1986"],
  },
  {
    mainServerSourceId: "PROJ",
    consIaSearchId: "PROJ",
    bibliographySigla: "PROJ",
    label: "Projeciologia",
    aliases: ["projeciologia"],
  },
  {
    mainServerSourceId: "QUEST",
    consIaSearchId: "QUEST",
    bibliographySigla: "",
    label: "Questões Mini",
    aliases: ["questoes mini", "questões mini"],
  },
  {
    mainServerSourceId: "TC",
    consIaSearchId: "TC",
    bibliographySigla: "TC",
    label: "Temas da Conscienciologia",
    aliases: ["temas da conscienciologia"],
  },
  {
    mainServerSourceId: "ZEFIRO",
    consIaSearchId: "ZEFIRO",
    bibliographySigla: "",
    label: "Zéfiro",
    aliases: ["zefiro", "zéfiro"],
  },
];
export const AGENT_BOOK_IDS = AGENT_BOOKS.map((book) => book.mainServerSourceId);
export function agentBook(id: string | undefined) {
  return AGENT_BOOKS.find(
    (book) =>
      book.mainServerSourceId === id ||
      book.consIaSearchId === id ||
      book.aliases.includes(id ?? ""),
  );
}
export function agentBookLabel(id: string | undefined): string {
  return agentBook(id)?.label ?? "";
}

export const ICGE_TARGETS: Record<(typeof AGENT_ICGE_AREAS)[number], string> = {
  "": "https://www.icge.org.br/",
  agenda: "https://www.icge.org.br/?page_id=6051",
  instituicoes: "https://www.icge.org.br/?page_id=6611",
  publicacoes: "https://www.icge.org.br/?page_id=1417",
  enciclopedia: "https://www.icge.org.br/?page_id=13493",
  memoria: "https://www.icge.org.br/?page_id=2585",
  videos: "https://www.icge.org.br/?page_id=9973",
  autopesquisa: "https://www.icge.org.br/?page_id=1385",
  holociclo: "https://www.icge.org.br/?page_id=12238",
};

export const RESOURCE_TARGETS: Record<(typeof AGENT_RESOURCE_IDS)[number], string> = {
  periodicos: "https://periodicos.conscienciologia.org.br/",
  enciclopedia: "https://enciclopediadaconscienciologia.org/",
  livros_pdf:
    "https://drive.google.com/drive/folders/1Mp6Zfhq-peIYlo9Js0wYRX2DnRjFYyUj?usp=sharing",
  quiz: "https://notebooklm.google.com/notebook/8f6fc286-021f-4184-b572-7f17c8561539",
  flashcards: "https://notebooklm.google.com/notebook/2da2f57f-996c-4efd-b24c-c2f49ba8b452",
  consgpt: "https://chatgpt.com/g/g-68a5d68b96c4819189dd1e6fb0def83f-consgpt",
  conslm: "https://notebooklm.google.com/notebook/c3528e65-0c2b-4a80-b3f2-2f22e3626b67",
};
