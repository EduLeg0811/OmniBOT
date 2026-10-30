import {
  AGENT_BOOKS,
  AGENT_TARGETS,
  type AgentBook,
  agentBook,
  fold,
} from "@/agent/config";
import type { AgentAction, AgentIntentId } from "@/agent/types";
import type { AgentPillDestination } from "@/agent/settings";

export type CitationExtractionOptions = {
  assistantText: string;
  userQuestion?: string;
  destination?: AgentPillDestination;
  english?: boolean;
  existingActions?: readonly { id: string; href?: string }[];
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
]);

function isLikelyVerbeteTitle(raw: string): boolean {
  const title = cleanTitle(raw);
  if (title.length < 3 || title.length > 50) return false;
  const words = title.split(" ");
  if (words.length > 6) return false;
  const folded = fold(title);
  if (STOPWORDS_VERBETE.has(folded)) return false;
  return true;
}

/** Extrai títulos de verbetes citados explicitamente na resposta. */
export function extractCitedVerbetes(text: string): string[] {
  const verbetes = new Set<string>();

  // 1. Padrão no texto: Verbete *Autolucidez*, verbete "Autolucidez", verbete «Autolucidez»
  const inlineRegex =
    /\bverbete[s]?\s*(?::\s*)?(?:["'“«*]+([A-ZÀ-Ú][a-zA-ZÀ-ú0-9\s–—\-]{2,50}?)["'”»*]+|([A-ZÀ-Ú][a-zà-ú]+(?:\s+[a-zà-ú]+){0,4}))(?=[,.;:\n\r\s]|\s+da\s+Enciclop[ée]dia|\s*\(|\s+de\b|$)/gu;
  for (const match of text.matchAll(inlineRegex)) {
    const candidate = match[1] || match[2];
    if (candidate && isLikelyVerbeteTitle(candidate)) {
      verbetes.add(cleanTitle(candidate));
    }
  }

  // 2. Padrão em referências bibliográficas: ... In: Enciclopédia da Conscienciologia
  const biblioRegex =
    /(?:^|\n)\s*(?:\d+[.)]|\*|-)?\s*(?:[A-ZÀ-Ú\s,]+?\.\s*)?(?:["'“«*]*([A-ZÀ-Ú][a-zA-ZÀ-ú0-9\s–—\-]{2,50}?)["'”»*]*\.\s*)?In:\s*Enciclop[ée]dia\s+da\s+Conscienciologia/gimu;
  for (const match of text.matchAll(biblioRegex)) {
    const candidate = match[1];
    if (candidate && isLikelyVerbeteTitle(candidate)) {
      verbetes.add(cleanTitle(candidate));
    }
  }

  // 3. Padrão: Enciclopédia da Conscienciologia ... verbete: *Título*
  const encicVerbeteRegex =
    /Enciclop[ée]dia\s+da\s+Conscienciologia[^\n]*?verbete\s*[:\s]*["'“«*]*([A-ZÀ-Ú][a-zA-ZÀ-ú0-9\s–—\-]{2,50}?)["'”»*]*(?=[,.\n\r]|$)/gimu;
  for (const match of text.matchAll(encicVerbeteRegex)) {
    const candidate = match[1];
    if (candidate && isLikelyVerbeteTitle(candidate)) {
      verbetes.add(cleanTitle(candidate));
    }
  }

  return Array.from(verbetes);
}

export type CitedBookMatch = {
  book: AgentBook;
  term: string;
};

/** Identifica obras de Waldo Vieira citadas na resposta e trechos/conceitos associados. */
export function extractCitedBooks(text: string, defaultTerm = ""): CitedBookMatch[] {
  const results: CitedBookMatch[] = [];
  const seenBooks = new Set<string>();

  // Analisa cada obra do catálogo canônico
  for (const book of AGENT_BOOKS) {
    if (seenBooks.has(book.mainServerSourceId)) continue;

    // Busca o nome da obra ou apelidos
    const aliases = [book.label, ...book.aliases];
    let bookIndex = -1;
    let matchedAlias = "";

    for (const alias of aliases) {
      if (alias.length < 4) continue;
      // Procura com limites de palavra
      const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const match = regex.exec(text);
      if (match) {
        bookIndex = match.index;
        matchedAlias = alias;
        break;
      }
    }

    if (bookIndex >= 0) {
      seenBooks.add(book.mainServerSourceId);

      // Procura trechos entre aspas ou expressão citada na proximidade (janela de ±200 caracteres)
      const windowStart = Math.max(0, bookIndex - 150);
      const windowEnd = Math.min(text.length, bookIndex + matchedAlias.length + 200);
      const snippet = text.slice(windowStart, windowEnd);

      let term = "";
      const quoteMatch = /["“«]([^"”»]{3,60})["”»]/.exec(snippet);
      if (quoteMatch && quoteMatch[1]) {
        term = cleanTitle(quoteMatch[1]);
      }

      if (!term && defaultTerm) {
        term = cleanTitle(defaultTerm);
      }

      results.push({ book, term: term || matchedAlias });
    }
  }

  return results;
}

/** Constrói o conjunto de ações de pills de citação com base no destino selecionado. */
export function extractCitationActions({
  assistantText,
  userQuestion = "",
  destination = "cons-ia",
  english = false,
  existingActions = [],
  turnId,
  maxActions = 4,
}: CitationExtractionOptions): AgentAction[] {
  if (!assistantText || assistantText.trim().length === 0) return [];

  const actions: AgentAction[] = [];
  const existingHrefs = new Set(
    existingActions.map((a) => a.href).filter((h): h is string => Boolean(h)),
  );

  const isDuplicateHref = (href: string) => existingHrefs.has(href);

  // Termo central padrão a partir da pergunta do usuário (restringe a 4 palavras)
  const defaultTerm = userQuestion
    .replace(/[?.,!;:]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");

  // 1. Verbetes citados
  const citedVerbetes = extractCitedVerbetes(assistantText);
  for (const verbete of citedVerbetes) {
    if (actions.length >= maxActions) break;

    const href =
      destination === "consteca"
        ? `/search?q=${encodeURIComponent(verbete)}&sources=enciclopedia&type=literal`
        : url(AGENT_TARGETS.search_verbete, { q: verbete, fields: "titulo" });

    if (isDuplicateHref(href)) continue;
    existingHrefs.add(href);

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
      confidence: 0.9,
      service: destination === "consteca" ? "ConsTECA" : "Cons-IA",
      destination: "busca de verbetes",
      turnId,
      meta: { term: verbete, field: "titulo", source: "citation" },
    });
  }

  // 2. Livros citados
  const citedBooks = extractCitedBooks(assistantText, defaultTerm);
  for (const { book, term } of citedBooks) {
    if (actions.length >= maxActions) break;

    const searchTerm = term || defaultTerm || book.label;
    const consTecaSource = book.mainServerSourceId.toLowerCase();
    const consIaBookId = book.consIaSearchId || book.mainServerSourceId;

    const href =
      destination === "consteca"
        ? `/search?q=${encodeURIComponent(searchTerm)}&sources=${encodeURIComponent(consTecaSource)}&type=literal`
        : url(AGENT_TARGETS.search_book, { q: searchTerm, books: consIaBookId });

    if (isDuplicateHref(href)) continue;
    existingHrefs.add(href);

    const conciseLabel =
      book.mainServerSourceId === "EXP"
        ? "700 Exp."
        : book.mainServerSourceId === "PROJ"
          ? "Projeciologia"
          : book.mainServerSourceId === "LO"
            ? "Léxico"
            : book.mainServerSourceId === "DAC"
              ? "DAC"
              : book.label.length > 20
                ? `${book.label.slice(0, 18)}…`
                : book.label;

    const pillLabel =
      searchTerm && searchTerm !== book.label
        ? `${conciseLabel}: "${searchTerm.length > 20 ? `${searchTerm.slice(0, 18)}…` : searchTerm}"`
        : conciseLabel;

    actions.push({
      id: "search_book",
      kind: "open-url",
      label: pillLabel,
      title:
        destination === "consteca"
          ? english
            ? `Search “${searchTerm}” in ${book.label} via ConsTECA`
            : `Pesquisar “${searchTerm}” em ${book.label} na ConsTECA`
          : english
            ? `Search “${searchTerm}” in ${book.label} via Cons-IA`
            : `Pesquisar “${searchTerm}” em ${book.label} no Cons-IA`,
      href,
      confidence: 0.88,
      service: destination === "consteca" ? "ConsTECA" : "Cons-IA",
      destination: `busca em ${book.label}`,
      turnId,
      meta: { term: searchTerm, book: book.mainServerSourceId, source: "citation" },
    });
  }

  // 3. Demais módulos mapeados
  if (actions.length < maxActions) {
    // Conscienciograma
    if (
      /\b(?:conscienciograma|avalia[çc][ãa]o\s+conscienciom[ée]trica|folha\s+de\s+avalia[çc][ãa]o)\b/i.test(
        assistantText,
      )
    ) {
      const term = defaultTerm || "Conscienciograma";
      const href =
        destination === "consteca"
          ? `/search?q=${encodeURIComponent(term)}&sources=ccg&type=literal`
          : url(AGENT_TARGETS.search_conscienciograma, { q: term });

      if (!isDuplicateHref(href)) {
        existingHrefs.add(href);
        actions.push({
          id: "search_conscienciograma",
          kind: "open-url",
          label: `CCG: ${term}`,
          title: english ? `Open Conscienciogram for “${term}”` : `Abrir Conscienciograma para “${term}”`,
          href,
          confidence: 0.85,
          service: destination === "consteca" ? "ConsTECA" : "Cons-IA",
          destination: "Conscienciograma",
          turnId,
          meta: { term, source: "citation" },
        });
      }
    }
  }

  return actions;
}

