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
  "catalogo_ccci",
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
  catalogo_ccci: envUrl("VITE_ICGE_URL", "https://www.icge.org.br/"),
  open_resource: "#",
  list_sources: "#",
} satisfies Record<AgentIntentId, string>;

export const AGENT_VERBETE_FIELDS = ["texto", "titulo", "autor", "especialidade"] as const;
export type AgentVerbeteField = (typeof AGENT_VERBETE_FIELDS)[number];
/** Catálogo de destinos da CCCI.
 *
 * Deixou de ser «áreas do ICGE»: atravessa seis domínios, e por isso o rótulo
 * do pill nomeia o destino real — quem clica em «EDITARES» não espera cair no
 * ICGE.
 *
 * O `hint` não é documentação: é o único manípulo que Luna tem para escolher.
 * Sem uma linha que separe cada destino do vizinho mais próximo, o modelo
 * decide pelo nome do id e erra — foi o que a medição das 411 perguntas
 * mostrou no campo `book`, preenchido com TEAT em 61,5% das ações porque a
 * descrição do campo não dizia quando deixar vazio.
 */
export type CcciDestination = {
  id: string;
  label: string;
  url: string;
  hint: string;
};

const ICGE = (pageId: number) => `https://www.icge.org.br/?page_id=${pageId}`;

export const CCCI_DESTINATIONS = [
  // ── Vídeo e transmissões ────────────────────────────────────────────────
  {
    id: "busca_video",
    label: "Busca em vídeos",
    url: ICGE(9973),
    hint: "Busca uma fala DENTRO das transmissões gravadas, com resultado no minuto exato. Use quando se quer saber onde algo foi dito em vídeo.",
  },
  {
    id: "lives",
    label: "Próximas lives",
    url: "https://taxologia.com/lives/",
    hint: "Agenda das próximas transmissões ao vivo. Use para o que vai passar e quando.",
  },
  {
    id: "canal_video",
    label: "Canal Tertuliarium",
    url: "https://www.youtube.com/user/Tertuliarium",
    hint: "Canal oficial de vídeos. Use para assistir; nunca para localizar um trecho falado.",
  },
  {
    id: "filmografia",
    label: "Filmografia",
    url: ICGE(2093),
    hint: "Filmes de cinema comentados pela Conscienciologia. Não confundir com vídeos da CCCI.",
  },
  // ── Atividades de debate ────────────────────────────────────────────────
  {
    id: "tertuliarium",
    label: "Tertuliarium",
    url: "https://www.tertuliarium.org/",
    hint: "Atividades do Tertuliarium: o que são, horários e como participar. Guarda-chuva das tertúlias.",
  },
  {
    id: "tertulia_matinal",
    label: "Tertúlia Matinal",
    url: ICGE(3127),
    hint: "Especificamente a Tertúlia Matinal.",
  },
  {
    id: "circulo_mentalsomatico",
    label: "Círculo Mentalsomático",
    url: ICGE(1409),
    hint: "Especificamente o Círculo Mentalsomático.",
  },
  {
    id: "megacons",
    label: "Megacons",
    url: ICGE(3872),
    hint: "Grupo de estudos semanal do CEAEC sobre temas da Conscienciologia, especialmente o Léxico de Ortopensatas; quintas, 9h.",
  },
  // ── Livros ──────────────────────────────────────────────────────────────
  {
    id: "livros_catalogo",
    label: "Catálogo de livros",
    url: ICGE(6581),
    hint: "Que livros existem, com ano, editora e idiomas. Use para saber quais obras há; não é repositório de download.",
  },
  {
    id: "livros_comprar",
    label: "EDITARES",
    url: "https://editares.org/",
    hint: "Livraria. Use somente quando se quer ADQUIRIR um livro.",
  },
  {
    id: "autores_livros",
    label: "Autores de livros",
    url: ICGE(6519),
    hint: "Quem escreveu o quê. Use para autoria, não para o conteúdo da obra.",
  },
  // ── Publicações periódicas ──────────────────────────────────────────────
  {
    id: "revistas",
    label: "Revistas científicas",
    url: ICGE(2927),
    hint: "Panorama institucional das revistas científicas da CCCI. Para LER ou buscar artigo, prefira o recurso periodicos.",
  },
  {
    id: "publicacoes_ccci",
    label: "Publicações CCCI",
    url: ICGE(1417),
    hint: "Panorama institucional do que a CCCI publica, em geral.",
  },
  // ── Produção enciclopédica ──────────────────────────────────────────────
  {
    id: "verbetes_defendidos",
    label: "Verbetes defendidos",
    url: ICGE(1604),
    hint: "Listagem dos verbetes já defendidos. Para quem PRODUZ verbete; nunca para consultar o conteúdo de um verbete.",
  },
  {
    id: "verbetes_andamento",
    label: "Verbetes em andamento",
    url: ICGE(1621),
    hint: "Verbetes em escrita. Para quem PRODUZ verbete e quer saber o que já está sendo feito.",
  },
  {
    id: "verbetoteca",
    label: "Verbetoteca",
    url: ICGE(13493),
    hint: "Navegação institucional da Verbetoteca. Para consultar o conteúdo de um verbete use search_verbete. Nunca sugerir junto com search_verbete (preferir search_verbete).",
  },
  // ── Referência conceitual ───────────────────────────────────────────────
  {
    id: "especialidades",
    label: "Especialidades",
    url: ICGE(1878),
    hint: "Lista oficial das especialidades (ciências) da Conscienciologia. Use quando se pergunta se existe especialidade sobre um tema.",
  },
  {
    id: "tecnicas",
    label: "Técnicas",
    url: ICGE(4772),
    hint: "Thesaurus das técnicas conscienciológicas. Use quando o tema é uma técnica nomeada.",
  },
  {
    id: "proad",
    label: "PROAD",
    url: ICGE(3669),
    hint: "Programa de Aceleração da Desperticidade.",
  },
  {
    id: "laboratorios",
    label: "Laboratórios",
    url: ICGE(13350),
    hint: "Laboratórios de autopesquisa do campus. Use quando se pergunta pelos labs ou pela estrutura de pesquisa.",
  },
  {
    id: "holociclo",
    label: "Holociclo",
    url: ICGE(12238),
    hint: "Holociclo e suas tecas.",
  },
  // ── História e instituições ─────────────────────────────────────────────
  {
    id: "cronologia",
    label: "Cronologia",
    url: ICGE(4083),
    hint: "Linha do tempo da Conscienciologia: datas e marcos.",
  },
  {
    id: "instituicoes",
    label: "Instituições",
    url: ICGE(6611),
    hint: "Quais instituições conscienciocêntricas existem.",
  },
  {
    id: "waldo_vieira",
    label: "Waldo Vieira",
    url: ICGE(6820),
    hint: "Sobre o autor Waldo Vieira. Para o conteúdo das obras dele use search_book.",
  },
  {
    id: "memoria",
    label: "Memória CCCI",
    url: ICGE(2585),
    hint: "Acervo de jornais, informativos e arquivos de imprensa da CCCI.",
  },
  {
    id: "estatisticas",
    label: "Anuário",
    url: "https://anuariodaconscienciologia.org.br/",
    hint: "Séries históricas e números da Conscienciologia.",
  },
  // ── Fallback ────────────────────────────────────────────────────────────
  {
    id: "raiz",
    label: "ICGE",
    url: "https://www.icge.org.br/",
    hint: "Página inicial do ICGE. Use apenas quando nenhum destino acima serve e ainda assim há pedido claro de navegação.",
  },
] as const satisfies readonly CcciDestination[];

export const CCCI_DESTINATION_IDS = CCCI_DESTINATIONS.map(
  (item) => item.id,
) as unknown as readonly [string, ...string[]];

export function ccciDestination(id: string | undefined) {
  return CCCI_DESTINATIONS.find((item) => item.id === id) ?? CCCI_DESTINATIONS.at(-1)!;
}

/** Páginas que nunca devem ser recomendadas.
 *
 * Não bastaria mantê-las fora do catálogo: esta verificação roda na construção
 * da URL, para que um id reintroduzido por engano — ou por variável de
 * ambiente — ainda assim não vire pill. */
const BLOCKED_ICGE_PAGE_IDS = ["4006", "6051", "1385"];

export function isBlockedCcciUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)icge\.org\.br$/i.test(parsed.hostname)) return false;
    const pageId = parsed.searchParams.get("page_id");
    return pageId !== null && BLOCKED_ICGE_PAGE_IDS.includes(pageId);
  } catch {
    return false;
  }
}

export function isIcgeVerbetotecaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)icge\.org\.br$/i.test(parsed.hostname) &&
      parsed.searchParams.get("page_id") === "13493"
    );
  } catch {
    return false;
  }
}

export function isSearchVerbeteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)cons-ia\.org$/i.test(parsed.hostname) &&
      parsed.pathname.includes("index_search_verb.html")
    );
  } catch {
    return false;
  }
}
/** Seções da Encyclossapiens.
 *
 * O alvo era fixo no Kit do Verbetógrafo — uma das sete seções —, e no replay
 * a ferramenta disparou sobre relatos pessoais colados, onde o Kit é
 * claramente o destino errado. O site trata só de verbetografia e da
 * Enciclopédia, então três seções cobrem o que a amostra pede. */
export const ENCYCLOSSAPIENS_SECTIONS = ["kit", "enciclopedia", "pesquisa"] as const;
export type EncyclossapiensSection = (typeof ENCYCLOSSAPIENS_SECTIONS)[number];
export const ENCYCLOSSAPIENS_TARGETS: Record<
  EncyclossapiensSection,
  { url: string; label: string; hint: string }
> = {
  kit: {
    url: "https://encyclossapiens.org/kit-verbetografo/",
    label: "Kit do Verbetógrafo",
    hint: "Como escrever, formatar, submeter e defender um verbete.",
  },
  enciclopedia: {
    url: "https://encyclossapiens.org/ec/",
    label: "Enciclopédia",
    hint: "O que é a Enciclopédia, sua estrutura, descrição e download.",
  },
  pesquisa: {
    url: "https://encyclossapiens.org/autoverbetografia/",
    label: "Autoverbetografia",
    hint: "Pesquisa da instituição: autoverbetografia e autossuficiência enciclopédica.",
  },
};

export const AGENT_RESOURCE_IDS = [
  "periodicos",
  "enciclopedia",
  "livros_pdf",
  "quiz",
  "flashcards",
  "consgpt",
  "conslm",
] as const;

export const AGENT_PLANNER_TIMEOUT_MS = 12_000;
export const AGENT_CLASSIFIER_MODEL = "gpt-5.6-luna";
export const AGENT_CLASSIFIER_REASONING = { id: "none", label: "None" } as const;
export const AGENT_CONFIDENCE_MEDIUM = 0.55;
export const AGENT_ANSWER_MAX = 320;

/** Quanto o envio espera pela triagem antes de seguir sem ela.
 *
 * Dentro do orçamento vale o caminho completo, com `direct` e `list_sources`
 * respondendo sem o modelo principal; fora dele o turno segue especulativo e
 * os pills entram quando chegarem.
 *
 * O valor sai da medição, não de estimativa: em série, a mediana da Luna fica
 * perto de 3 s. Com 1,2 s — o palpite anterior — nenhum dos 411 turnos cabia
 * no orçamento, e a corrida degenerava em «especular sempre», levando junto a
 * resposta local de `list_sources`, a única que conhece os arquivos
 * carregados. */
export const AGENT_TRIAGE_BUDGET_MS = 3000;

/** Conceitos compostos da Conscienciologia estouram quatro palavras
 * («Programa de Aceleração da Desperticidade», «Técnica do Ainda Não É») e,
 * no limite antigo, anulavam a ação inteira em silêncio. */
export const AGENT_TERM_MAX_WORDS = 6;

/** Janela de supressão do mesmo pill dentro da conversa. As séries longas da
 * amostra repetem o tema por 6 a 10 turnos; sem isto o mesmo par
 * intenção+termo reaparece a cada resposta. */
export const AGENT_PILL_DEDUPE_TURNS = 3;

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

/** NFKD, e não NFD: colagens vindas de PDF trazem ligaduras tipográficas
 * («deﬁna», «Léxico»), que só a normalização de compatibilidade desfaz. */
export const fold = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Resolve a obra a partir do nome escrito por extenso.
 *
 * O classificador costuma pôr «Léxico de Ortopensatas 2019» em `term` e deixar
 * `book` vazio, mesmo havendo apelido exato no catálogo. Sem esta resolução o
 * pill de bibliografia abre sem obra nenhuma — era o caso de quatro dos seis
 * pills de bibliografia medidos. */
export function agentBookByName(value: string | undefined) {
  const needle = fold(value ?? "");
  if (needle.length < 4) return undefined;
  return AGENT_BOOKS.find((book) =>
    [book.label, ...book.aliases].some((name) => {
      const hay = fold(name);
      return hay.length >= 4 && (needle === hay || needle.includes(hay));
    }),
  );
}

export const RESOURCE_TARGETS: Record<(typeof AGENT_RESOURCE_IDS)[number], string> = {
  periodicos: "https://periodicos.conscienciologia.org.br/",
  enciclopedia: "https://enciclopediadaconscienciologia.org/",
  livros_pdf:
    "https://drive.google.com/drive/folders/1Mp6Zfhq-peIYlo9Js0wYRX2DnRjFYyUj?usp=sharing",
  quiz: "https://notebooklm.link.google/nEesZnRp21eu",
  flashcards: "https://notebooklm.link.google/OdYcHoLNuP1P",
  consgpt: "https://chatgpt.com/g/g-68a5d68b96c4819189dd1e6fb0def83f-consgpt",
  conslm: "https://notebook.google.com/notebook/c3528e65-0c2b-4a80-b3f2-2f22e3626b67",
};
