import {
  AGENT_BOOKS,
  AGENT_TARGETS,
  type AgentBook,
  fold,
} from "@/agent/config";
import type { AgentAction } from "@/agent/types";
import type { AgentPillDestination } from "@/agent/settings";

export type CitationExtractionOptions = {
  assistantText: string;
  userQuestion?: string;
  destination?: AgentPillDestination;
  english?: boolean;
  existingActions?: readonly { id: string; href?: string; meta?: Record<string, string> }[];
  turnId?: string;
  maxActions?: number;
};

const url = (base: string, params: Record<string, string>) => {
  const target = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value) target.searchParams.set(key, value);
  });
  return target.toString();
};

const cleanTitle = (value: string): string =>
  value
    .replace(/^["'“«*_\s]+|["'”»*_\s.,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const STOPWORDS_VERBETE = new Set([
  "enciclopedia",
  "conscienciologia",
  "waldo",
  "vieira",
  "tertulia",
  "definicao",
  "argumentacao",
  "referencias",
  "conclusao",
  "exemplo",
  "sugestoes",
  "aprofundamento",
  "verbete",
  "verbetes",
  "artigo",
  "livro",
  "obra",
  "pesquisa",
  "estudo",
  "tema",
  "analise",
]);

function isLikelyVerbeteTitle(raw: string): boolean {
  const title = cleanTitle(raw);
  if (title.length < 3 || title.length > 45) return false;
  const words = title.split(" ");
  if (words.length > 5) return false;
  const folded = fold(title);
  if (STOPWORDS_VERBETE.has(folded)) return false;
  return true;
}

/**
 * Extrai verbetes explicitamente citados como fontes temáticas ou recomendações
 * formais de aprofundamento na resposta (ex.: seção # Referências ou "verbete *X*").
 */
export function extractCitedVerbetes(text: string): string[] {
  const verbetes = new Set<string>();

  // 1. Padrão estrito em referências bibliográficas: ... In: Enciclopédia da Conscienciologia
  const biblioRegex =
    /(?:^|\n)\s*(?:\d+[.)]|\*|-)?\s*(?:[A-ZÀ-Ú\s,]+?\.\s*)?(?:["'“«*]*([A-ZÀ-Ú][a-zA-ZÀ-ú0-9\s–—\-]{2,45}?)["'”»*]*\.\s*)?In:\s*Enciclop[ée]dia\s+da\s+Conscienciologia/gimu;
  for (const match of text.matchAll(biblioRegex)) {
    const candidate = match[1];
    if (candidate && isLikelyVerbeteTitle(candidate)) {
      verbetes.add(cleanTitle(candidate));
    }
  }

  // 2. Padrão no texto: explicitamente "verbete *Título*" ou "verbete «Título»" ou "verbete "Título""
  const inlineRegex =
    /\bverbete[s]?\s*(?::\s*)?(?:["'“«*]+([A-ZÀ-Ú][a-zA-ZÀ-ú0-9\s–—\-]{2,45}?)["'”»*]+)(?=[,.;:\n\r\s]|\s+da\s+Enciclop[ée]dia|\s*\(|\s+de\b|$)/gu;
  for (const match of text.matchAll(inlineRegex)) {
    const candidate = match[1];
    if (candidate && isLikelyVerbeteTitle(candidate)) {
      verbetes.add(cleanTitle(candidate));
    }
  }

  return Array.from(verbetes);
}

export type SubstantiveBookCitation = {
  book: AgentBook;
  /** Trecho textual literal entre aspas ou marcador específico citado (cap./exp.) */
  quotedSnippet: string;
};

/**
 * Identifica SOMENTE citações substantivas de livros de Waldo Vieira:
 * Requer citação de trecho textual entre aspas ("...") ou referência específica
 * a capítulo/experimento/página diretamente vinculada à obra.
 *
 * Mera menção ao nome do livro NÃO é suficiente para gerar pill.
 */
export function extractSubstantiveBookCitations(text: string): SubstantiveBookCitation[] {
  const results: SubstantiveBookCitation[] = [];
  const seenBooks = new Set<string>();

  for (const book of AGENT_BOOKS) {
    if (seenBooks.has(book.mainServerSourceId)) continue;

    const aliases = [book.label, ...book.aliases];
    let bookIndex = -1;
    let matchedAlias = "";

    for (const alias of aliases) {
      if (alias.length < 4) continue;
      const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const match = regex.exec(text);
      if (match) {
        bookIndex = match.index;
        matchedAlias = alias;
        break;
      }
    }

    if (bookIndex >= 0) {
      // Janela de proximidade estrita: no máximo 140 caracteres antes ou 160 depois do nome da obra
      const windowStart = Math.max(0, bookIndex - 140);
      const windowEnd = Math.min(text.length, bookIndex + matchedAlias.length + 160);
      const snippet = text.slice(windowStart, windowEnd);

      // Critério 1: Trecho entre aspas de 2 a 10 palavras associado à citação
      let quotedSnippet = "";
      const quoteMatch = /["“«]([^"”»\n\r]{6,80})["”»]/.exec(snippet);
      if (quoteMatch && quoteMatch[1]) {
        const cleaned = cleanTitle(quoteMatch[1]);
        const words = cleaned.split(/\s+/);
        // Exige pelo menos 2 palavras e no máximo 10 para ser um trecho pesquisável pertinente
        if (words.length >= 2 && words.length <= 10) {
          quotedSnippet = cleaned;
        }
      }

      // Critério 2: Referência a capítulo ou experimento específico (ex.: "capítulo 120", "experimento 450")
      if (!quotedSnippet) {
        const specMatch =
          /\b(?:cap[íi]tulo\s+\d+|cap\.\s*\d+|experimento\s+\d+|item\s+\d+|p[áa]g(?:ina)?\.?\s*\d+)\b/i.exec(
            snippet,
          );
        if (specMatch) {
          quotedSnippet = specMatch[0].trim();
        }
      }

      // IMPORTANTE: Só inclui se houver citação substantiva de trecho ou capítulo.
      // Se for mera menção do livro ou presença na bibliografia geral, descarta.
      if (quotedSnippet) {
        seenBooks.add(book.mainServerSourceId);
        results.push({ book, quotedSnippet });
      }
    }
  }

  return results;
}

/**
 * Constrói ações pertinentes de pesquisa orientadas pela relevância e pelo princípio
 * de parcimônia: no máximo 1 a 2 pills altamente contextuais, sem redundância com
 * a pergunta do usuário ou com ações já planejadas.
 */
export function extractCitationActions({
  assistantText,
  userQuestion = "",
  destination = "cons-ia",
  english = false,
  existingActions = [],
  turnId,
  maxActions = 2, // Teto máximo prudente: no máximo 1 ou 2 pills por resposta
}: CitationExtractionOptions): AgentAction[] {
  if (!assistantText || assistantText.trim().length === 0) return [];

  const actions: AgentAction[] = [];
  const existingHrefs = new Set(
    existingActions.map((a) => a.href).filter((h): h is string => Boolean(h)),
  );

  // Normalização de termos existentes para evitar redundância semântica
  const existingTerms = new Set(
    existingActions
      .map((a) => (a.meta?.term ? fold(a.meta.term) : ""))
      .filter((t) => t.length > 2),
  );

  const questionFolded = fold(userQuestion);

  const isRedundant = (href: string, term: string) => {
    if (existingHrefs.has(href)) return true;
    const termFolded = fold(term);
    if (termFolded && existingTerms.has(termFolded)) return true;
    return false;
  };

  // 1. Prioridade Máxima: Citação de trecho substantivo de livro
  // Se o assistente citou uma frase textual de Waldo Vieira entre aspas, este é o pill mais valioso.
  const bookCitations = extractSubstantiveBookCitations(assistantText);
  for (const { book, quotedSnippet } of bookCitations) {
    if (actions.length >= maxActions) break;

    const consTecaSource = book.mainServerSourceId.toLowerCase();
    const consIaBookId = book.consIaSearchId || book.mainServerSourceId;

    const href =
      destination === "consteca"
        ? `/search?q=${encodeURIComponent(quotedSnippet)}&sources=${encodeURIComponent(consTecaSource)}&type=literal`
        : url(AGENT_TARGETS.search_book, { q: quotedSnippet, books: consIaBookId });

    if (isRedundant(href, quotedSnippet)) continue;
    existingHrefs.add(href);
    existingTerms.add(fold(quotedSnippet));

    const conciseLabel =
      book.mainServerSourceId === "EXP"
        ? "700 Exp."
        : book.mainServerSourceId === "PROJ"
          ? "Projeciologia"
          : book.mainServerSourceId === "LO"
            ? "Léxico"
            : book.mainServerSourceId === "DAC"
              ? "DAC"
              : book.label.length > 18
                ? `${book.label.slice(0, 16)}…`
                : book.label;

    const snippetLabel =
      quotedSnippet.length > 35 ? `${quotedSnippet.slice(0, 32)}…` : quotedSnippet;

    actions.push({
      id: "search_book",
      kind: "open-url",
      label: `${conciseLabel}: "${snippetLabel}"`,
      title:
        destination === "consteca"
          ? english
            ? `Search “${quotedSnippet}” in ${book.label} via ConsTECA`
            : `Pesquisar “${quotedSnippet}” em ${book.label} na ConsTECA`
          : english
            ? `Search “${quotedSnippet}” in ${book.label} via Cons-IA`
            : `Pesquisar “${quotedSnippet}” em ${book.label} no Cons-IA`,
      href,
      confidence: 0.95,
      service: destination === "consteca" ? "ConsTECA" : "Cons-IA",
      destination: `busca em ${book.label}`,
      turnId,
      meta: { term: quotedSnippet, book: book.mainServerSourceId, source: "citation" },
    });
  }

  // 2. Segunda Prioridade: Verbetes citados explicitamente como fonte temática
  // Só indica se for um conceito substantivo que agregue à pesquisa e não repita o termo da pergunta.
  if (actions.length < maxActions) {
    const citedVerbetes = extractCitedVerbetes(assistantText);
    for (const verbete of citedVerbetes) {
      if (actions.length >= maxActions) break;

      const verbeteFolded = fold(verbete);

      // Não sugere verbete que seja mera repetição da própria pergunta do usuário
      // se já houver qualquer ação no turno para ela
      if (existingActions.length > 0 && questionFolded.includes(verbeteFolded)) {
        continue;
      }

      const href =
        destination === "consteca"
          ? `/search?q=${encodeURIComponent(verbete)}&sources=enciclopedia&type=literal`
          : url(AGENT_TARGETS.search_verbete, { q: verbete, fields: "titulo" });

      if (isRedundant(href, verbete)) continue;
      existingHrefs.add(href);
      existingTerms.add(verbeteFolded);

      actions.push({
        id: "search_verbete",
        kind: "open-url",
        label: english ? `Entry: ${verbete}` : `Verbete: ${verbete}`,
        title:
          destination === "consteca"
            ? english
              ? `Search entry in ConsTECA for “${verbete}”`
              : `Busca o verbete na ConsTECA por “${verbete}”`
            : english
              ? `Search entry in Cons-IA for “${verbete}”`
              : `Busca o verbete no Cons-IA por “${verbete}”`,
        href,
        confidence: 0.92,
        service: destination === "consteca" ? "ConsTECA" : "Cons-IA",
        destination: "busca de verbetes",
        turnId,
        meta: { term: verbete, field: "titulo", source: "citation" },
      });
    }
  }

  // 3. Demais módulos: apenas com indicação explícita e inequívoca de consulta
  if (actions.length < maxActions) {
    // Conscienciograma: apenas se houver citação explícita de autoavaliação ou folha/pergunta de avaliação
    if (
      /\b(?:folha\s+de\s+avalia[çc][ãa]o|avalia[çc][ãa]o\s+conscienciom[ée]trica\s+no\s+Conscienciograma|pergunta\s+n[ºo°]?\s*\d+\s+do\s+Conscienciograma)\b/i.test(
        assistantText,
      )
    ) {
      const ccgTerm = "Autoavaliação";
      const href =
        destination === "consteca"
          ? `/search?q=${encodeURIComponent(ccgTerm)}&sources=ccg&type=literal`
          : url(AGENT_TARGETS.search_conscienciograma, { q: ccgTerm });

      if (!existingHrefs.has(href)) {
        existingHrefs.add(href);
        actions.push({
          id: "search_conscienciograma",
          kind: "open-url",
          label: `Conscienciograma: Autoavaliação`,
          title: english ? "Open Conscienciogram" : "Abrir autoavaliação no Conscienciograma",
          href,
          confidence: 0.88,
          service: destination === "consteca" ? "ConsTECA" : "Cons-IA",
          destination: "Conscienciograma",
          turnId,
          meta: { term: ccgTerm, source: "citation" },
        });
      }
    }
  }

  return actions;
}
