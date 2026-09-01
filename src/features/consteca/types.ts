export type SearchKind = "smart" | "literal";
export type ResultsView = "grouped" | "ranked";

export type CorpusSource = {
  id: string;
  code: string;
  label: string;
  fileStem: string;
  recordCount: number | null;
  lexicalAvailable: boolean;
  semanticAvailable: boolean;
};

export type CorpusMetadata = {
  author?: string;
  area?: string;
  theme?: string;
  date?: string;
  section?: string;
  argument?: string;
  folha?: string;
  sigla?: string;
  link?: string;
};

export type CorpusSearchResult = {
  id: string;
  sourceId: string;
  sourceCode: string;
  sourceLabel: string;
  title: string | null;
  page: string | null;
  paragraph: number | null;
  text: string;
  score: number | null;
  matchKind: "semantic" | "literal";
  metadata: CorpusMetadata;
};

export type CorpusResultGroup = {
  sourceId: string;
  sourceCode: string;
  sourceLabel: string;
  totalFound: number;
  shownCount: number;
  topScore: number | null;
  results: CorpusSearchResult[];
};

export type CorpusSearchResponse = {
  query: string;
  kind: SearchKind;
  totalFound: number;
  shownCount: number;
  durationMs: number;
  groups: CorpusResultGroup[];
  results: CorpusSearchResult[];
  failures: Array<{ sourceId: string; detail: string }>;
  rateLimit?: { count: number; remaining: number | null };
};

export type SearchPreferences = {
  kind: SearchKind;
  sourceIds: string[];
  view: ResultsView;
  smartLimit: number;
  literalLimit: number;
};
