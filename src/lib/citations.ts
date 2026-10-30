/**
 * Utilitários para detecção e remoção de artefatos de citação interna gerados
 * por ferramentas de busca em arquivos (OpenAI File Search, Assistants, etc.).
 *
 * Tokens como `fileciteturn0file0turn0file2`, `【4:0†source】` ou `[turn0file0]`
 * são gerados internamente pelo modelo ao ancorar respostas em fontes do
 * vector store e não devem ser exibidos nas respostas aos usuários.
 */

const OPENAI_FULLWIDTH_BRACKET_REGEX = /【[^】]*(?:】|$)/g;
const BRACKETED_FILECITE_REGEX = /\[\s*(?:filecite|turn\d+file\d+|source)[^\]]*(?:\]|$)/gi;
const FILECITE_TOKEN_REGEX = /filecite(?::\s*|\s+)?[a-zA-Z0-9_]*/gi;
const TURN_FILE_TOKEN_REGEX = /(?:turn\d+file\d+)+/gi;
const CITE_TURN_REGEX = /\bcite(?::\s*|\s+)turn\d+file\d+\b/gi;

/**
 * Remove qualquer marcação de citação interna (filecite, turnXfileY, 【...†source】)
 * do texto da resposta, ajustando pontuação e espaçamento residuais.
 */
export function stripCitations(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // 1. Remove anotações entre colchetes especiais do OpenAI: 【...】
  cleaned = cleaned.replace(OPENAI_FULLWIDTH_BRACKET_REGEX, "");

  // 2. Remove citações entre colchetes padrão: [turn0file0], [filecite:...]
  cleaned = cleaned.replace(BRACKETED_FILECITE_REGEX, "");

  // 3. Remove `cite turnXfileY`
  cleaned = cleaned.replace(CITE_TURN_REGEX, "");

  // 4. Remove tokens iniciados por `filecite` (ex: fileciteturn0file0turn0file2, filecite:turn0file0)
  cleaned = cleaned.replace(FILECITE_TOKEN_REGEX, "");

  // 5. Remove tokens isolados ou concatenados de turnXfileY
  cleaned = cleaned.replace(TURN_FILE_TOKEN_REGEX, "");

  // 6. Remove espaço antes de pontuações decorrente da remoção de citações: "palavra ." -> "palavra."
  cleaned = cleaned.replace(/[^\S\r\n]+([.,;:!?])/g, "$1");

  // 7. Colapsa múltiplos espaços horizontais sem afetar quebras de linha
  cleaned = cleaned.replace(/[^\S\r\n]{2,}/g, " ");

  // 8. Remove espaços em branco residuais no final de cada linha
  cleaned = cleaned.replace(/[^\S\r\n]+$/gm, "");

  return cleaned;
}

