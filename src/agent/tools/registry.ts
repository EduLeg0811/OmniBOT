import {
  AGENT_BOOK_IDS,
  AGENT_ICGE_AREAS,
  AGENT_RESOURCE_IDS,
  AGENT_TARGETS,
  AGENT_VERBETE_FIELDS,
  ICGE_TARGETS,
  RESOURCE_TARGETS,
  agentBook,
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
    resource: match.resource ?? "",
  },
});
const common = {
  book: {
    type: "string",
    enum: ["", ...AGENT_BOOK_IDS],
    description: "Obra canônica; vazio se não se aplica.",
  },
  field: {
    type: "string",
    enum: AGENT_VERBETE_FIELDS,
    description: "Campo do verbete; texto quando não se aplica.",
  },
  area: {
    type: "string",
    enum: AGENT_ICGE_AREAS,
    description: "Macroárea ICGE; vazio quando não se aplica.",
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
        ? `The literal book search for “${term}” is prepared below.`
        : `A busca literal por “${term}” nos livros está preparada abaixo.`,
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
        ? `The entry search for “${term}” is prepared below.`
        : `A pesquisa de “${term}” nos verbetes está preparada abaixo.`,
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
        ? `The Conscienciogram search for “${term}” is prepared below.`
        : `A busca de “${term}” no Conscienciograma está preparada abaixo.`,
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
        ? "bibliografia_livros: explicit request to build or consult a book reference. Set book whenever identifiable."
        : "bibliografia_livros: pedido explícito para montar ou consultar referência de livro. Preencha book quando identificável.",
    intro: ({ book }, en) =>
      en
        ? `The ${agentBook(book)?.label ?? "book"} reference can be prepared in the module below.`
        : `A referência de ${agentBook(book)?.label ?? "livro"} pode ser montada no módulo indicado.`,
    toAction: (m, c) => {
      const b = agentBook(m.book);
      const name = b?.label ?? "";
      return action(
        m,
        c,
        short(c.host.english ? "Bibliography" : "Bibliografia", name),
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
        ? `The entry bibliography${term ? ` for “${term}”` : ""} is prepared below.`
        : `A bibliografia de verbetes${term ? ` para “${term}”` : ""} está preparada abaixo.`,
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
        ? `A Cosmovision lexical consultation for “${term}” is prepared below.`
        : `A consulta lexical em Cosmovisão para “${term}” está preparada abaixo.`,
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
        ? "An orthothought draw can be started below."
        : "O sorteio de uma ortopensata pode ser iniciado pela opção abaixo.",
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
        ? "encyclossapiens: complementary resource for substantive questions about writing/submitting entries; action_only only for explicit navigation."
        : "encyclossapiens: recurso complementar para dúvidas substantivas sobre escrita/submissão de verbetes; action_only só em navegação explícita.",
    intro: (_m, en) =>
      en
        ? "The Encyclossapiens writing resources can be opened below."
        : "Os recursos de escrita da Encyclossapiens podem ser abertos abaixo.",
    toAction: (m, c) =>
      action(
        m,
        c,
        "Encyclossapiens",
        AGENT_TARGETS.encyclossapiens,
        "Encyclossapiens",
        "recursos de verbetografia",
      ),
  }),
  tool({
    name: "icge",
    termRequired: false,
    responsePolicy: "complementary",
    describe: (en) =>
      en
        ? "icge: complementary link for ICGE agenda, institutions, publications, Verbetoteca, memory, videos, self-research or Holocycle. Substantive questions use full; action_only only for explicit navigation. Pick nearest macro area."
        : "icge: link complementar para agenda, instituições, publicações, Verbetoteca, memória, vídeos, autopesquisa ou Holociclo. Perguntas substantivas usam full; action_only só em navegação explícita. Escolha a macroárea mais próxima.",
    intro: (_m, en) =>
      en
        ? "The relevant ICGE area can be opened below."
        : "A área pertinente do ICGE pode ser aberta abaixo.",
    toAction: (m, c) => {
      const area = AGENT_ICGE_AREAS.includes((m.area ?? "") as never)
        ? ((m.area ?? "") as keyof typeof ICGE_TARGETS)
        : "";
      const labels: Record<string, string> = {
        "": "ICGE",
        agenda: "Agenda ICGE",
        instituicoes: "Instituições",
        publicacoes: "Publicações CCCI",
        enciclopedia: "Verbetoteca",
        memoria: "Memória CCCI",
        videos: "Vídeos CCCI",
        autopesquisa: "Autopesquisa",
        holociclo: "Holociclo",
      };
      const label = labels[area] ?? "ICGE";
      return action(m, c, label, ICGE_TARGETS[area], "ICGE", label);
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
        ? "The requested resource can be opened below."
        : "O recurso solicitado pode ser aberto abaixo.",
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

export const MAX_AGENT_ACTIONS = 2;
export function agentTool(name: string) {
  return AGENT_TOOLS.find((item) => item.name === name);
}
export function actionsFromMatches(matches: AgentMatch[], ctx: AgentContext): AgentAction[] {
  const seen = new Set<AgentIntentId>();
  return matches
    .filter((match) => match.confidence >= 0.55)
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
    })
    .slice(0, MAX_AGENT_ACTIONS)
    .map((match, position) => ({ ...agentTool(match.intent)!.toAction(match, ctx), position }));
}
