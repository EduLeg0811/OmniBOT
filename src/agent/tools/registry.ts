import {
  AGENT_BOOK_IDS,
  AGENT_CONFIDENCE_MEDIUM,
  AGENT_RESOURCE_IDS,
  AGENT_TARGETS,
  AGENT_VERBETE_FIELDS,
  CCCI_DESTINATIONS,
  CCCI_DESTINATION_IDS,
  ENCYCLOSSAPIENS_SECTIONS,
  ENCYCLOSSAPIENS_TARGETS,
  RESOURCE_TARGETS,
  agentBook,
  agentBookByName,
  ccciDestination,
  fold,
  isBlockedCcciUrl,
  isIcgeVerbetotecaUrl,
  isSearchVerbeteUrl,
} from "@/agent/config";
import type {
  AgentAction,
  AgentContext,
  AgentIntentId,
  AgentMatch,
  AgentTool,
} from "@/agent/types";

const url = (base: string, params: Record<string, string>) => {
  const target = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value) target.searchParams.set(key, value);
  });
  return target.toString();
};
const short = (prefix: string, term: string) => (term ? `${prefix}: ${term}` : prefix);
/** A obra pode chegar em `book` ou escrita por extenso em `term`.
 *
 * O classificador tende a pôr «Léxico de Ortopensatas 2019» em `term` e deixar
 * `book` vazio; a bibliografia então abria sem sigla, isto é, vazia. */
const resolveBook = (match: AgentMatch) => agentBook(match.book) ?? agentBookByName(match.term);
const encyclossapiensSection = (match: AgentMatch) =>
  ENCYCLOSSAPIENS_TARGETS[
    (ENCYCLOSSAPIENS_SECTIONS as readonly string[]).includes(match.section ?? "")
      ? (match.section as keyof typeof ENCYCLOSSAPIENS_TARGETS)
      : "kit"
  ];
const title = (service: string, scope: string, english: boolean) =>
  english
    ? `Opens ${service} for ${scope} in a new tab`
    : `Abre ${service} para ${scope} em nova aba`;
const action = (
  match: AgentMatch,
  ctx: AgentContext,
  label: string,
  href: string,
  service: string,
  destination: string,
): AgentAction => ({
  id: match.intent,
  kind: match.intent === "list_sources" ? "inline-result" : "open-url",
  label,
  title: title(service, destination, ctx.host.english),
  href,
  confidence: match.confidence,
  service,
  destination,
  meta: {
    term: match.term,
    field: match.field ?? "",
    book: match.book ?? "",
    area: match.area ?? "",
    section: match.section ?? "",
    resource: match.resource ?? "",
  },
});
/** O esquema é estrito: todo campo é obrigatório em toda ação, mesmo nas
 * ferramentas que não o usam. Como o modelo é forçado a preencher, a descrição
 * precisa dizer QUANDO deixar vazio — sem isso ele escolhe o primeiro valor
 * plausível. Foi assim que `book` saiu como TEAT em 61,5% das ações medidas,
 * restringindo a busca a uma obra que não continha o termo. */
const common = {
  book: {
    type: "string",
    enum: ["", ...AGENT_BOOK_IDS],
    description:
      "Obra canônica. Preencha SOMENTE quando o usuário nomear a obra ou seu apelido. Em qualquer outro caso use vazio: preencher restringe a busca a um único livro e costuma zerar o resultado.",
  },
  field: {
    type: "string",
    enum: AGENT_VERBETE_FIELDS,
    description: "Campo do verbete; texto quando não se aplica.",
  },
  area: {
    type: "string",
    enum: CCCI_DESTINATION_IDS,
    description: [
      "Destino do catálogo CCCI, usado apenas por catalogo_ccci. Escolha pelo que o usuário quer fazer:",
      ...CCCI_DESTINATIONS.map((item) => `- ${item.id}: ${item.hint}`),
    ].join("\n"),
  },
  section: {
    type: "string",
    enum: ["", ...ENCYCLOSSAPIENS_SECTIONS],
    description: [
      "Seção da Encyclossapiens, usada apenas por encyclossapiens; vazio para as demais ferramentas.",
      ...ENCYCLOSSAPIENS_SECTIONS.map((id) => `- ${id}: ${ENCYCLOSSAPIENS_TARGETS[id].hint}`),
    ].join("\n"),
  },
  resource: {
    type: "string",
    enum: ["", ...AGENT_RESOURCE_IDS],
    description: "Recurso explicitamente solicitado; vazio quando não se aplica.",
  },
  style: {
    type: "string",
    enum: ["", "bee", "simples"],
    description: "Estilo bibliográfico; vazio usa simples.",
  },
};
const tool = (value: Omit<AgentTool, "parameters">): AgentTool => ({
  ...value,
  parameters: common,
});

export const AGENT_TOOLS: AgentTool[] = [
  tool({
    name: "search_book",
    termRequired: true,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "search_book: explicit literal search in one or all books. Not for conceptual questions. Put canonical book id in book."
        : "search_book: busca literal explicitamente pedida em um ou todos os livros. Não use para dúvida conceitual. Use o código canônico em book.",
    intro: ({ term }, en) =>
      en
        ? `The link below lets you search the Conscientiology books for “${term}”.`
        : `O link a seguir permite pesquisar “${term}” nos livros da Conscienciologia.`,
    toAction: (m, c) =>
      action(
        m,
        c,
        short(c.host.english ? "Books" : "Livros", m.term),
        url(AGENT_TARGETS.search_book, {
          q: m.term,
          books: agentBook(m.book)?.consIaSearchId ?? "",
        }),
        "Cons-IA",
        "busca literal nos livros",
      ),
  }),
  tool({
    name: "search_verbete",
    termRequired: true,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "search_verbete: explicit search in Encyclopedia entries. field selects texto, titulo, autor or especialidade."
        : "search_verbete: busca explicitamente pedida nos verbetes da Enciclopédia. field escolhe texto, titulo, autor ou especialidade.",
    intro: ({ term }, en) =>
      en
        ? `The link below lets you search the Encyclopedia entries for “${term}”.`
        : `O link a seguir permite pesquisar “${term}” nos verbetes da Enciclopédia.`,
    toAction: (m, c) =>
      action(
        m,
        c,
        short(c.host.english ? "Entries" : "Verbetes", m.term),
        url(AGENT_TARGETS.search_verbete, { q: m.term, field: m.field ?? "texto" }),
        "Cons-IA",
        `verbetes por ${m.field ?? "texto"}`,
      ),
  }),
  tool({
    name: "search_conscienciograma",
    termRequired: true,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "search_conscienciograma: explicit literal search in the Conscienciogram."
        : "search_conscienciograma: busca literal explicitamente pedida no Conscienciograma.",
    intro: ({ term }, en) =>
      en
        ? `The link below lets you search the Conscienciogram for “${term}”.`
        : `O link a seguir permite pesquisar “${term}” no Conscienciograma.`,
    toAction: (m, c) =>
      action(
        m,
        c,
        short("CCG", m.term),
        url(AGENT_TARGETS.search_conscienciograma, { q: m.term }),
        "Cons-IA",
        "Conscienciograma",
      ),
  }),
  tool({
    name: "bibliografia_livros",
    termRequired: false,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "bibliografia_livros: explicit request to build or consult a book reference. Name the work in book, or write it out in term."
        : "bibliografia_livros: pedido explícito para montar ou consultar referência de livro. Informe a obra em book ou escreva o nome dela em term.",
    intro: (m, en) => {
      const label = resolveBook(m)?.label;
      return en
        ? `The link below opens the bibliography module for ${label ?? "the book"}.`
        : `O link a seguir abre o módulo de bibliografia para ${label ?? "o livro"}.`;
    },
    toAction: (m, c) => {
      const b = resolveBook(m);
      return action(
        m,
        c,
        short(c.host.english ? "Bibliography" : "Bibliografia", b?.label ?? m.term),
        url(AGENT_TARGETS.bibliografia_livros, {
          sigla: b?.bibliographySigla ?? "",
          style: m.style || "simples",
        }),
        "Cons-IA",
        "bibliografia de livros",
      );
    },
  }),
  tool({
    name: "bibliografia_verbetes",
    termRequired: false,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "bibliografia_verbetes: explicit request for bibliography of Encyclopedia entries."
        : "bibliografia_verbetes: pedido explícito de bibliografia de verbetes da Enciclopédia.",
    intro: ({ term }, en) =>
      en
        ? `The link below opens the entry bibliography module${term ? ` for “${term}”` : ""}.`
        : `O link a seguir abre o módulo de bibliografia de verbetes${term ? ` para “${term}”` : ""}.`,
    toAction: (m, c) =>
      action(
        m,
        c,
        short(c.host.english ? "Entry bibliography" : "Bibliografia", m.term),
        url(AGENT_TARGETS.bibliografia_verbetes, { q: m.term, style: m.style || "simples" }),
        "Cons-IA",
        "bibliografia de verbetes",
      ),
  }),
  tool({
    name: "consulta_lexicons",
    termRequired: true,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "consulta_lexicons: explicit lexical, etymological, synonym or dictionary consultation. Always open default Cosmovision; never choose a module."
        : "consulta_lexicons: consulta lexical, etimológica, sinonímica ou dicionarística explicitamente pedida. Sempre abre a Cosmovisão padrão; nunca escolha módulo.",
    intro: ({ term }, en) =>
      en
        ? `The link below opens a Cosmovision lexical consultation for “${term}”.`
        : `O link a seguir abre a consulta lexical de “${term}” em Cosmovisão.`,
    toAction: (m, c) =>
      action(
        m,
        c,
        short("LexiCons", m.term),
        url(AGENT_TARGETS.consulta_lexicons, { q: m.term, autostart: "1" }),
        "LexiCons",
        "Cosmovisão",
      ),
  }),
  tool({
    name: "bibliomancia",
    termRequired: false,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "bibliomancia: explicit request to draw an orthothought or start Bibliomancy."
        : "bibliomancia: pedido explícito para sortear uma ortopensata ou iniciar a Bibliomancia.",
    intro: (_m, en) =>
      en
        ? "The option below starts an orthothought draw."
        : "A opção a seguir inicia o sorteio de uma ortopensata.",
    toAction: (m, c) =>
      action(
        m,
        c,
        c.host.english ? "Draw orthothought" : "Sortear ortopensata",
        url(AGENT_TARGETS.bibliomancia, { autostart: "1" }),
        "Cons-IA",
        "Bibliomancia",
      ),
  }),
  tool({
    name: "encyclossapiens",
    termRequired: false,
    responsePolicy: "complementary",
    describe: (en) =>
      en
        ? "encyclossapiens: institution dedicated ONLY to entry writing and to the Encyclopedia itself. Choose the section. Never for a personal narrative or a draft pasted for revision."
        : "encyclossapiens: instituição dedicada SOMENTE à escrita de verbetes e à própria Enciclopédia. Escolha a seção. Nunca para relato pessoal nem para rascunho colado em revisão.",
    intro: (m, en) => {
      const target = encyclossapiensSection(m);
      return en
        ? `The link below opens ${target.label} at Encyclossapiens.`
        : `O link a seguir abre ${target.label} na Encyclossapiens.`;
    },
    toAction: (m, c) => {
      const target = encyclossapiensSection(m);
      return action(m, c, target.label, target.url, "Encyclossapiens", target.label);
    },
  }),
  tool({
    name: "catalogo_ccci",
    termRequired: false,
    responsePolicy: "complementary",
    describe: (en) =>
      en
        ? "catalogo_ccci: one curated destination in the Conscientiology community catalogue (institutional pages, activities, video, books, periodicals). Pick the destination in area. Substantive questions still get a full answer; use this only when a specific destination genuinely adds something. Never pick raiz just to have an action."
        : "catalogo_ccci: um destino curado do catálogo da CCCI (páginas institucionais, atividades, vídeo, livros, periódicos). Escolha o destino em area. Perguntas substantivas continuam recebendo resposta; use isto só quando um destino específico acrescentar algo de fato. Nunca escolha raiz apenas para ter uma ação.",
    intro: (m, en) => {
      const target = ccciDestination(m.area);
      return en ? `The link below opens ${target.label}.` : `O link a seguir abre ${target.label}.`;
    },
    toAction: (m, c) => {
      const target = ccciDestination(m.area);
      return action(m, c, target.label, target.url, target.label, target.label);
    },
  }),
  tool({
    name: "open_resource",
    termRequired: false,
    responsePolicy: "fulfills_explicit_action",
    describe: (en) =>
      en
        ? "open_resource: ONLY explicit access/navigation/study-method requests for periodicos, enciclopedia, livros_pdf, quiz, flashcards, consgpt or conslm. Never promote ConsGPT/ConsLM spontaneously."
        : "open_resource: SOMENTE pedido explícito de acesso, navegação ou método de estudo para periodicos, enciclopedia, livros_pdf, quiz, flashcards, consgpt ou conslm. Nunca promova ConsGPT/ConsLM espontaneamente.",
    intro: (_m, en) =>
      en
        ? "The link below opens the requested resource."
        : "O link a seguir abre o recurso solicitado.",
    toAction: (m, c) => {
      const resource = AGENT_RESOURCE_IDS.includes((m.resource ?? "") as never)
        ? (m.resource as keyof typeof RESOURCE_TARGETS)
        : "enciclopedia";
      const labels: Record<string, string> = {
        periodicos: "Periódicos",
        enciclopedia: "Enciclopédia",
        livros_pdf: "Livros em PDF",
        quiz: "Quiz",
        flashcards: "Flashcards",
        consgpt: "ConsGPT",
        conslm: "ConsLM",
      };
      const label = labels[resource] ?? "Enciclopédia";
      return action(m, c, label, RESOURCE_TARGETS[resource], label, "acesso direto");
    },
  }),
  tool({
    name: "list_sources",
    termRequired: false,
    responsePolicy: "local",
    describe: (en) =>
      en
        ? "list_sources: asks which files/sources are loaded now. Use direct and this local action."
        : "list_sources: pergunta quais arquivos/fontes estão carregados agora. Use direct e esta ação local.",
    intro: (_m, en) =>
      en
        ? "The loaded consultation sources are listed below."
        : "As fontes de consulta carregadas estão listadas abaixo.",
    toAction: (m, c) =>
      action(
        m,
        c,
        c.host.english ? "Consultation sources" : "Fontes de consulta",
        "#",
        "ConsBOT",
        "fontes carregadas",
      ),
  }),
];

export const MAX_AGENT_ACTIONS = 3;

/** Identidade de um pill para efeito de repetição: a ferramenta mais o termo,
 * dobrado para ignorar acento, caixa e ligadura. */
export function agentActionKey(action: Pick<AgentAction, "id" | "meta">): string {
  return `${action.id}|${fold(action.meta?.term ?? "")}`;
}

/** Remove o pill que já apareceu há poucos turnos.
 *
 * As séries longas da amostra ficam 6 a 10 turnos no mesmo tema, e sem isto o
 * mesmo par ferramenta+termo reaparece embaixo de cada resposta. */
export function withoutRepeatedActions(
  actions: AgentAction[],
  recent: readonly Pick<AgentAction, "id" | "meta">[],
): AgentAction[] {
  const seen = new Set(recent.map(agentActionKey));
  return actions.filter((action) => !seen.has(agentActionKey(action)));
}
export function agentTool(name: string) {
  return AGENT_TOOLS.find((item) => item.name === name);
}
export function actionsFromMatches(matches: AgentMatch[], ctx: AgentContext): AgentAction[] {
  const seen = new Set<AgentIntentId>();
  const validCandidates = [...matches]
    // Ordenar antes de cortar. Antes o corte vinha primeiro, em duas etapas,
    // e uma ação de confiança alta podia ser descartada para dar lugar a
    // outra, mais fraca, só por ter vindo antes na lista do modelo.
    .sort((left, right) => right.confidence - left.confidence)
    .filter((match) => match.confidence >= AGENT_CONFIDENCE_MEDIUM)
    .filter((match) => {
      const item = agentTool(match.intent);
      if (!item || seen.has(match.intent) || (item.termRequired && !match.term)) return false;
      if (
        match.intent === "open_resource" &&
        !AGENT_RESOURCE_IDS.includes((match.resource ?? "") as never)
      )
        return false;
      seen.add(match.intent);
      return true;
    });

  // Regra pontual: nunca sugerir pills da Verbetoteca do ICGE (?page_id=13493) e da busca de verbetes
  // do Cons-IA (index_search_verb.html) ao mesmo tempo. Preferir sempre a busca de verbetes.
  const hasSearchVerbete = validCandidates.some((match) => match.intent === "search_verbete");
  const filteredCandidates = hasSearchVerbete
    ? validCandidates.filter(
        (match) =>
          !(
            match.intent === "catalogo_ccci" &&
            (match.area === "verbetoteca" ||
              isIcgeVerbetotecaUrl(ccciDestination(match.area)?.url ?? ""))
          ),
      )
    : validCandidates;

  const rawActions = filteredCandidates
    .slice(0, MAX_AGENT_ACTIONS)
    .map((match, position) => ({ ...agentTool(match.intent)!.toAction(match, ctx), position }))
    // Defesa em profundidade: os destinos vetados não constam do catálogo,
    // mas uma variável de ambiente ou um id reintroduzido por engano não
    // devem conseguir virar pill.
    .filter((item) => !isBlockedCcciUrl(item.href));

  // Defesa em profundidade secundária: se houver pill de busca de verbetes,
  // nunca manter pill da Verbetoteca do ICGE (?page_id=13493).
  const hasVerbetePill = rawActions.some(
    (item) => item.id === "search_verbete" || isSearchVerbeteUrl(item.href),
  );
  const actions = hasVerbetePill
    ? rawActions.filter(
        (item) =>
          !isIcgeVerbetotecaUrl(item.href) &&
          !(item.id === "catalogo_ccci" && item.meta?.area === "verbetoteca"),
      )
    : rawActions;

  return actions.map((action, position) =>
    action.position === position ? action : { ...action, position },
  );
}
