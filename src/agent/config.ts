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
/** Áreas do catálogo. Cada uma vira uma pergunta própria do classificador:
 * uma escolha entre 63 opções espalha a probabilidade e a área certa perde
 * para «nenhum»; escolhas pequenas por área separam melhor (e a Decisions API
 * recomenda separar assuntos diferentes em perguntas diferentes). A área
 * também diz com qual busca o destino disputa a mesma necessidade. */
export const CCCI_DOMAINS = {
  midia: "vídeos, transmissões, entrevistas, podcast e filmes",
  atividades: "atividades, debates, cursos, dinâmicas e visitas",
  livros: "livros: catálogo, leitura on-line, autoria, compra",
  publicacoes: "revistas, publicações e artigos acadêmicos",
  verbetes: "verbetes da Enciclopédia: listagens, relações entre verbetes, autores de verbetes",
  referencia:
    "obras de referência e ferramentas: glossário, dicionários, siglas, especialidades, técnicas",
  pgc: "a Prova Geral de Conscienciologia (PGC)",
  institucional: "instituições, história, números e iniciantes",
} as const;
export type CcciDomain = keyof typeof CCCI_DOMAINS;

export type CcciDestination = {
  id: string;
  domain: CcciDomain;
  label: string;
  url: string;
  hint: string;
};

const ICGE = (pageId: number) => `https://www.icge.org.br/?page_id=${pageId}`;

export const CCCI_DESTINATIONS = [
  // ── Vídeo, áudio e transmissões ─────────────────────────────────────────
  {
    id: "busca_video",
    domain: "midia",
    label: "Busca em vídeos",
    url: ICGE(9973),
    hint: "Busca uma fala DENTRO das transmissões gravadas, com resultado no minuto exato. Use quando se quer saber onde algo foi dito em vídeo.",
  },
  {
    id: "lives",
    domain: "midia",
    label: "Próximas lives",
    url: "https://taxologia.com/lives/",
    hint: "Agenda das próximas transmissões ao vivo. Use para o que vai passar e quando.",
  },
  {
    id: "canal_video",
    domain: "midia",
    label: "Canal Tertuliarium",
    url: "https://www.youtube.com/user/Tertuliarium",
    hint: "Canal oficial de vídeos das tertúlias. Use para assistir; nunca para localizar um trecho falado.",
  },
  {
    id: "videos_introdutorios",
    domain: "midia",
    label: "Vídeos introdutórios",
    url: ICGE(9672),
    hint: "Animações curtas que explicam temas da Conscienciologia, mais livros gratuitos. Use para iniciantes que querem vídeos didáticos.",
  },
  {
    id: "tv_cognopolis",
    domain: "midia",
    label: "TV Cognópolis",
    url: ICGE(5666),
    hint: "Entrevistas da TV Cognópolis em ordem cronológica.",
  },
  {
    id: "podcasts",
    domain: "midia",
    label: "IIPCast",
    url: ICGE(9800),
    hint: "Episódios do podcast IIPCast. Use quando se pede podcast ou áudio.",
  },
  {
    id: "filmografia",
    domain: "midia",
    label: "Filmografia",
    url: ICGE(2093),
    hint: "Filmes de cinema comentados pela Conscienciologia, por especialidade. Não confundir com vídeos da CCCI.",
  },
  // ── Atividades, cursos e debates ────────────────────────────────────────
  {
    id: "tertuliarium",
    domain: "atividades",
    label: "Tertuliarium",
    url: "https://www.tertuliarium.org/",
    hint: "Atividades do Tertuliarium: o que são, horários e como participar. Guarda-chuva das tertúlias.",
  },
  {
    id: "tertulia_matinal",
    domain: "atividades",
    label: "Tertúlia Matinal",
    url: ICGE(3127),
    hint: "Especificamente a Tertúlia Matinal (domingos): temas e pesquisadores, com papers e vídeos.",
  },
  {
    id: "circulo_mentalsomatico",
    domain: "atividades",
    label: "Círculo Mentalsomático",
    url: ICGE(1409),
    hint: "Especificamente o Círculo Mentalsomático (sábados): temas, papers e vídeos.",
  },
  {
    id: "megacons",
    domain: "atividades",
    label: "Megacons",
    url: ICGE(3872),
    hint: "Grupo de estudos do CEAEC sobre o Léxico de Ortopensatas e o DAC, com a lista de temas.",
  },
  {
    id: "debates_ceaec",
    domain: "atividades",
    label: "Debates CEAEC",
    url: ICGE(3628),
    hint: "Temas dos Debates públicos do CEAEC (domingos à tarde).",
  },
  {
    id: "calepino",
    domain: "atividades",
    label: "Calepino Conscienciológico",
    url: ICGE(3631),
    hint: "Temas do Calepino Conscienciológico (AIEC).",
  },
  {
    id: "atividades_gratuitas",
    domain: "atividades",
    label: "Atividades gratuitas",
    url: ICGE(5680),
    hint: "Atividades GRATUITAS das instituições, com dia, horário e link. Use quando se quer participar de algo sem custo.",
  },
  {
    id: "cursos",
    domain: "atividades",
    label: "Matriz de cursos",
    url: ICGE(3267),
    hint: "Cursos, dinâmicas, preceptorias e assessorias regulares de todas as instituições, com filtro. Use quando se procura um curso.",
  },
  {
    id: "dinamicas",
    domain: "atividades",
    label: "Dinâmicas parapsíquicas",
    url: ICGE(2626),
    hint: "O que são as dinâmicas parapsíquicas e o quadro semanal de horários.",
  },
  {
    id: "tenepes_planetaria",
    domain: "atividades",
    label: "Tenepes Planetária",
    url: ICGE(10354),
    hint: "A dinâmica Tenepes Planetária e o painel de participantes. Não é para explicar a tenepes.",
  },
  {
    id: "proad",
    domain: "atividades",
    label: "PROAD",
    url: ICGE(3669),
    hint: "O curso PROAD (Programa de Aceleração da Desperticidade): descrição e estrutura.",
  },
  {
    id: "cognopolis_visita",
    domain: "atividades",
    label: "Cognópolis Experience",
    url: ICGE(12554),
    hint: "Calendário e receptivo para VISITAR a Cognópolis em Foz do Iguaçu.",
  },
  // ── Livros ──────────────────────────────────────────────────────────────
  {
    id: "livros_catalogo",
    domain: "livros",
    label: "Catálogo de livros",
    url: ICGE(6581),
    hint: "Que livros conscienciológicos existem, com ano, editora e idiomas. Use para saber quais obras há; não é repositório de leitura nem de download.",
  },
  {
    id: "livros_online",
    domain: "livros",
    label: "Livros on-line",
    url: ICGE(2467),
    hint: "Livros conscienciológicos em português para LER on-line de graça.",
  },
  {
    id: "livros_outros_idiomas",
    domain: "livros",
    label: "Livros em outros idiomas",
    url: ICGE(5534),
    hint: "Livros da Conscienciologia em inglês, espanhol e outros idiomas, com links de leitura.",
  },
  {
    id: "livros_waldo",
    domain: "livros",
    label: "Livros de Waldo Vieira",
    url: ICGE(3946),
    hint: "Cronologia das obras de Waldo Vieira, com sinopses. Use para saber quais livros ele escreveu e quando.",
  },
  {
    id: "livros_comprar",
    domain: "livros",
    label: "EDITARES",
    url: "https://editares.org/",
    hint: "Livraria. Use somente quando se quer COMPRAR um livro.",
  },
  {
    id: "autores_livros",
    domain: "livros",
    label: "Autores de livros",
    url: ICGE(6519),
    hint: "Quem escreveu quais livros conscienciológicos. Use para autoria de livros, não para o conteúdo da obra.",
  },
  {
    id: "autorandos",
    domain: "livros",
    label: "Autorandos",
    url: ICGE(1419),
    hint: "Livros em ESCRITA: quem está escrevendo sobre qual tema.",
  },
  {
    id: "producao_autor",
    domain: "livros",
    label: "Produção por autor",
    url: ICGE(12634),
    hint: "Painel com toda a produção bibliográfica de um autor (livros, artigos, verbetes).",
  },
  {
    id: "conscienciograma",
    domain: "livros",
    label: "Conscienciograma",
    url: ICGE(6289),
    hint: "O livro Conscienciograma em texto integral, para ler ou fazer a autoavaliação. Para BUSCAR um termo nele use search_conscienciograma.",
  },
  // ── Publicações periódicas e acadêmicas ─────────────────────────────────
  {
    id: "revistas",
    domain: "publicacoes",
    label: "Revistas científicas",
    url: ICGE(2927),
    hint: "Panorama das revistas científicas da CCCI, com uma página por revista. Para LER ou buscar artigo, prefira o recurso periodicos.",
  },
  {
    id: "publicacoes_ccci",
    domain: "publicacoes",
    label: "Publicações CCCI",
    url: ICGE(1417),
    hint: "Banco de mais de 15 mil publicações da CCCI, pesquisável por autor, tema e tipo.",
  },
  {
    id: "artigos_academicos",
    domain: "publicacoes",
    label: "Artigos acadêmicos",
    url: ICGE(14158),
    hint: "Teses, dissertações e artigos acadêmicos externos sobre a Conscienciologia.",
  },
  // ── Enciclopédia e verbetes ─────────────────────────────────────────────
  {
    id: "verbetes_defendidos",
    domain: "verbetes",
    label: "Verbetes defendidos",
    url: ICGE(1604),
    hint: "Listagem dos verbetes já defendidos. Para quem PRODUZ verbete; nunca para consultar o conteúdo de um verbete.",
  },
  {
    id: "verbetes_andamento",
    domain: "verbetes",
    label: "Verbetes em andamento",
    url: ICGE(1621),
    hint: "Títulos de verbete reservados. Para quem PRODUZ verbete e quer saber se um título já está sendo escrito.",
  },
  {
    id: "verbetoteca",
    domain: "verbetes",
    label: "Verbetoteca",
    url: ICGE(13493),
    hint: "Navegação institucional da Verbetoteca. Para consultar o conteúdo de um verbete use search_verbete. Nunca sugerir junto com search_verbete (preferir search_verbete).",
  },
  {
    id: "verbetes_waldo",
    domain: "verbetes",
    label: "Verbetes de Waldo Vieira",
    url: ICGE(4397),
    hint: "Os 2.019 verbetes escritos por Waldo Vieira, pela ordem e número da tertúlia.",
  },
  {
    id: "remissiologia",
    domain: "verbetes",
    label: "Cosmovisão Remissiológica",
    url: ICGE(10228),
    hint: "Verbetes RELACIONADOS a um tema ou verbete (remissões). Use quando se quer ampliar a leitura para verbetes vizinhos.",
  },
  {
    id: "ranking_verbetografos",
    domain: "verbetes",
    label: "Ranking de verbetógrafos",
    url: ICGE(1807),
    hint: "Quantos verbetes cada autor escreveu; quem mais escreveu.",
  },
  {
    id: "holociclo",
    domain: "verbetes",
    label: "Holociclo",
    url: ICGE(12238),
    hint: "História do Holociclo, o laboratório de enciclopedismo do CEAEC.",
  },
  // ── Obras de referência e ferramentas ───────────────────────────────────
  {
    id: "glossario",
    domain: "referencia",
    label: "Glossário multilíngue",
    url: ICGE(1973),
    hint: "Glossário da Conscienciologia em português, inglês, espanhol e alemão. Use para TRADUZIR um termo conscienciológico.",
  },
  {
    id: "neologismos",
    domain: "referencia",
    label: "Dicionário de Neologismos",
    url: ICGE(6674),
    hint: "Dicionário de Neologismos da Conscienciologia em texto integral. Use para o significado de um neologismo.",
  },
  {
    id: "siglas",
    domain: "referencia",
    label: "Siglas",
    url: ICGE(1785),
    hint: "Lista das siglas usadas na Conscienciologia, com o significado.",
  },
  {
    id: "especialidades",
    domain: "referencia",
    label: "Especialidades",
    url: ICGE(1878),
    hint: "Lista oficial das especialidades (ciências) da Conscienciologia, com definições. Use quando se pergunta se existe especialidade sobre um tema.",
  },
  {
    id: "tecnicas",
    domain: "referencia",
    label: "Técnicas",
    url: ICGE(4772),
    hint: "Thesaurus das técnicas conscienciológicas, com o passo a passo. Use quando o tema é uma técnica nomeada.",
  },
  {
    id: "infograficos",
    domain: "referencia",
    label: "Infográficos",
    url: ICGE(2281),
    hint: "Infográficos e mapas didáticos para baixar.",
  },
  {
    id: "revisao_ortografica",
    domain: "referencia",
    label: "Revisão ortográfica",
    url: ICGE(11055),
    hint: "Ferramenta que revisa a ortografia de textos conscienciológicos e dos neologismos.",
  },
  {
    id: "megatrafor",
    domain: "referencia",
    label: "Identificação do megatrafor",
    url: ICGE(14280),
    hint: "Ferramenta interativa para identificar o próprio megatrafor.",
  },
  {
    id: "laboratorios",
    domain: "referencia",
    label: "Laboratórios",
    url: ICGE(13350),
    hint: "Painel com dados dos laboratórios de autopesquisa do campus CEAEC. Use quando se pergunta pelos labs.",
  },
  // ── Prova Geral de Conscienciologia ─────────────────────────────────────
  {
    id: "pgc",
    domain: "pgc",
    label: "Prova de Conscienciologia",
    url: ICGE(1830),
    hint: "O que é a Prova Geral de Conscienciologia (PGC), histórico e conteúdo.",
  },
  {
    id: "pgc_provas",
    domain: "pgc",
    label: "PGC: provas e resultados",
    url: ICGE(11267),
    hint: "Provas anteriores da PGC: conteúdo programático, gabaritos, notas e estatísticas.",
  },
  {
    id: "pgc_simulado",
    domain: "pgc",
    label: "Simulado da PGC",
    url: ICGE(11210),
    hint: "Simulado interativo para treinar para a PGC.",
  },
  // ── História, instituições e números ────────────────────────────────────
  {
    id: "cronologia",
    domain: "institucional",
    label: "Cronologia",
    url: ICGE(4083),
    hint: "Linha do tempo da Conscienciologia: datas e marcos.",
  },
  {
    id: "instituicoes",
    domain: "institucional",
    label: "Instituições",
    url: ICGE(6611),
    hint: "Quais instituições conscienciocêntricas existem, com o site de cada uma.",
  },
  {
    id: "cronologia_ics",
    domain: "institucional",
    label: "Cronologia das ICs",
    url: ICGE(3234),
    hint: "Quando cada instituição foi fundada e quem a dirigiu.",
  },
  {
    id: "colegios_invisiveis",
    domain: "institucional",
    label: "Colégios Invisíveis",
    url: ICGE(1916),
    hint: "Os Colégios Invisíveis da Conscienciologia: quais são e como participar.",
  },
  {
    id: "iniciantes",
    domain: "institucional",
    label: "Para iniciantes",
    url: ICGE(13079),
    hint: "Porta de entrada para iniciantes, com perguntas frequentes e vídeos. Somente quando o usuário diz que está começando ou pergunta por onde começar; não para explicar um tema.",
  },
  {
    id: "waldo_vieira",
    domain: "institucional",
    label: "Waldo Vieira",
    url: ICGE(6820),
    hint: "Sobre o autor Waldo Vieira: biografia, entrevistas, artigos. Para o conteúdo das obras dele use search_book.",
  },
  {
    id: "aleia_genios",
    domain: "institucional",
    label: "Aleia dos Gênios",
    url: ICGE(1693),
    hint: "Aleia dos Gênios do campus CEAEC: os bustos de personalidades.",
  },
  {
    id: "memoria",
    domain: "institucional",
    label: "Imprensa e vídeos da CCCI",
    url: ICGE(2585),
    hint: "Reportagens, notas de imprensa e vídeos sobre a Conscienciologia na mídia.",
  },
  {
    id: "memoria_digital",
    domain: "institucional",
    label: "Memória Digital",
    url: ICGE(3369),
    hint: "Jornais, boletins e informativos históricos das instituições, digitalizados.",
  },
  {
    id: "censo",
    domain: "institucional",
    label: "Censo ICNet",
    url: ICGE(10499),
    hint: "Números ATUAIS da Conscienciologia em tempo real: voluntários, atividades.",
  },
  {
    id: "congracamento",
    domain: "institucional",
    label: "Congraçamento CCCI",
    url: ICGE(12384),
    hint: "Realizações anuais das instituições (edição mais recente, com links para as anteriores).",
  },
  {
    id: "estatisticas",
    domain: "institucional",
    label: "Anuário",
    url: "https://anuariodaconscienciologia.org.br/",
    hint: "Séries históricas e números da Conscienciologia ao longo dos anos.",
  },
  // ── Fallback ────────────────────────────────────────────────────────────
  {
    id: "raiz",
    domain: "institucional",
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

export const AGENT_PLANNER_TIMEOUT_MS = 6_000;

/** Motor do classificador. `decisions` usa a Decisions API (`/api/decisions`
 * no Main-Server) e cai para `responses` — o caminho antigo, `/api/llm` com
 * JSON Schema — se o endpoint não existir ou falhar. Os deploys do frontend e
 * do Main-Server são separados, e o turno nunca pode depender da ordem deles. */
export const AGENT_CLASSIFIER_ENGINE: "decisions" | "responses" =
  String((import.meta.env as Record<string, unknown>).VITE_AGENT_CLASSIFIER_ENGINE ?? "")
    .trim()
    .toLowerCase() === "responses"
    ? "responses"
    : "decisions";
/** Teto da chamada à Decisions API, do lado do navegador. O servidor recebe
 * um pouco menos, para responder com erro antes de o navegador abortar e o
 * fallback ainda caber no orçamento do turno. */
export const AGENT_DECISIONS_TIMEOUT_MS = 4_000;
/** Probabilidade mínima de um predicado (ou de «algum destino se aplica»)
 * para virar pill. São probabilidades do modelo, não números que ele escreve:
 * o limiar vem da suíte (`npm run agent:suite -- --engine decisions`). */
export const AGENT_DECISION_THRESHOLD = 0.6;
/** Limiar do catálogo CCCI, mais alto que o geral. São 63 destinos, em
 * oito perguntas por área. Medido: falsos positivos em 0,61–0,73 («Onde encontro o livro
 * Conscienciograma?» → catálogo de livros ou EDITARES); verdadeiros a partir
 * de 0,78 (instituições) e quase todos acima de 0,9. */
export const AGENT_DECISION_CATALOG_MIN = 0.75;
/** Probabilidade mínima da forma social ou de «fontes carregadas» para o turno
 * responder sem o modelo principal. Alta de propósito: engolir uma pergunta é
 * pior que gastar uma chamada. */
export const AGENT_DECISION_DIRECT_MIN = 0.75;
export const AGENT_CLASSIFIER_MODEL = "gpt-6-luna";
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
 * carregados.
 *
 * Com a Decisions API (p50 0,27 s, p90 0,4 s na suíte) a triagem resolve muito
 * antes do teto, e o envio só espera o tempo real dela. O teto continua em 3 s
 * para o fallback pela Responses API, que segue na casa dos 3 s. */
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
  livros_pdf: "https://drive.google.com/drive/u/2/folders/1Mp6Zfhq-peIYlo9Js0wYRX2DnRjFYyUj",
  quiz: "https://notebooklm.link.google/nEesZnRp21eu",
  flashcards: "https://notebooklm.link.google/OdYcHoLNuP1P",
  consgpt: "https://chatgpt.com/g/g-68a5d68b96c4819189dd1e6fb0def83f-consgpt",
  conslm: "https://notebook.google.com/notebook/c3528e65-0c2b-4a80-b3f2-2f22e3626b67",
};
