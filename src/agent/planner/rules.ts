import { actionsFromMatches } from "@/agent/tools/registry";
import type { AgentAction, AgentContext, AgentMatch } from "@/agent/types";
import type { AgentTriage } from "@/agent/planner/triage";

export const UPLOAD_PATTERN_PT =
  /\b(?:upload|subir|anexar|enviar|carregar)\b.*\b(?:arquivo|ficheiro|pdf|doc|documento|foto|imagem)\b|\b(?:posso|consigo|como|d[áa]\s+para)\s+(?:fazer\s+upload|subir\s+arquivo|anexar\s+arquivo|enviar\s+arquivo)\b/iu;
export const UPLOAD_PATTERN_EN =
  /\b(?:upload|attach)\b.*\b(?:file|pdf|doc|document|image)\b|\b(?:can\s+i|how\s+to)\s+upload\b/iu;

export const GRAPHIC_PATTERN_PT =
  /\b(?:ger[ae]|gerar|cri[ae]|criar|desenh[ae]|desenhar|faz(?:er)?|fa[çz]a)\b.*(?:figura|diagrama(?:\s+gr[áa]fico)?|imagem|desenho|ilustra[çc][ãa]o|fluxograma\s+visual|mapa\s+conceitual)|\b(?:voc[êe]\s+)?(?:gera|cria|desenha|faz)\s+(?:imagem|figura|diagrama|desenho|ilustra[çc][ãa]o)/iu;
export const GRAPHIC_PATTERN_EN =
  /\b(?:generate|create|draw|make).*(?:figure|graphic\s+diagram|image|drawing|illustration|visual\s+flowchart|conceptual\s+map)\b/iu;

export const SCOPE_PATTERN_PT =
  /\b(?:voc[êe]\s+tem|tem\s+acesso|acervo\s+tem|abrange).*(?:outros\s+livros|livros\s+de\s+outros\s+autores|artigos\s+de\s+revistas)\b/iu;
export const SCOPE_PATTERN_EN =
  /\b(?:do\s+you\s+have|access\s+to).*(?:other\s+books|other\s+authors|journal\s+articles)\b/iu;

export const PERIODICOS_PATTERN_PT =
  /\b(?:artigos?(?:\s+cient[íi]ficos?)?|peri[oó]dicos?(?:\s+da\s+conscienciologia)?|revistas?(?:\s+cient[íi]ficas?)?|revista\s+conscientia)\b/iu;
export const PERIODICOS_PATTERN_EN =
  /\b(?:scientific\s+articles?|periodicals?|journals?|conscientia\s+journal)\b/iu;

export const LIVROS_PDF_PATTERN_PT =
  /\b(?:livro\w*|obra\w*|tratado\w*|manual|l[ée]xico)\b.*(?:pdf|baixar|download|completo|integral|google\s+drive|drive|link)|\b(?:pdf|baixar|download|google\s+drive|drive)\b.*(?:livro\w*|obra\w*|tratado\w*|manual|l[ée]xico)|\b(?:onde|como)\s+(?:acho|encontro|acesso|baixo|est[áa]|fica|tem).*(?:livro\w*|obra\w*|tratado\w*|pdf)/iu;
export const LIVROS_PDF_PATTERN_EN =
  /\b(?:books?|works?|treatises?).*(?:pdf|download|full|complete|google\s+drive)\b|\b(?:download|pdf).*(?:books?|works?)\b/iu;

/** Gatilhos que indicam pergunta puramente substantiva/conceitual (que deve seguir para resposta completa). */
const CONCEPTUAL_TRIGGERS_PT =
  /\b(?:o\s+que\s+[ée](?:\s+|$)|oque\s+[ée](?:\s+|$)|explique|conceitue|defina|diferen[çc]a|qual\s+a\s+rela[çc][ãa]o|fale\s+sobre|discorra|resuma|como\s+funciona|quais\s+s[ãa]o\s+os\s+princ[íi]pios)/iu;
const CONCEPTUAL_TRIGGERS_EN =
  /\b(?:what\s+is|explain|define|difference|tell\s+me\s+about|summarize|how\s+does\s+it\s+work)\b/iu;

export function isConceptualQuestion(text: string, english: boolean): boolean {
  return english ? CONCEPTUAL_TRIGGERS_EN.test(text) : CONCEPTUAL_TRIGGERS_PT.test(text);
}

/** Retorna ações determinísticas aplicáveis à mensagem, se houver. */
export function matchDeterministicActions(ctx: AgentContext): AgentAction[] {
  const text = ctx.userText.trim();
  const en = ctx.host.english;
  const matches: AgentMatch[] = [];

  if (en ? PERIODICOS_PATTERN_EN.test(text) : PERIODICOS_PATTERN_PT.test(text)) {
    matches.push({
      intent: "open_resource",
      confidence: 0.95,
      term: "",
      resource: "periodicos",
    });
  }

  if (en ? LIVROS_PDF_PATTERN_EN.test(text) : LIVROS_PDF_PATTERN_PT.test(text)) {
    matches.push({
      intent: "open_resource",
      confidence: 0.95,
      term: "",
      resource: "livros_pdf",
    });
  }

  return actionsFromMatches(matches, ctx);
}

/** Avalia regras determinísticas para resposta direta (direct) imediata. */
export function matchDeterministicRules(ctx: AgentContext): AgentTriage | null {
  const text = ctx.userText.trim();
  const en = ctx.host.english;

  // 1. Restrição: Upload de arquivos
  if (en ? UPLOAD_PATTERN_EN.test(text) : UPLOAD_PATTERN_PT.test(text)) {
    return {
      mode: "direct",
      responseMode: "direct",
      answer: en
        ? "ConsBOT operates in conversational text mode and does not support uploading, receiving, or analyzing user files."
        : "O ConsBOT opera exclusivamente em modo conversacional e não realiza upload de arquivos (não recebe nem analisa arquivos enviados pelo usuário).",
      answerOrigin: "catalog",
      actions: [],
      confidence: 1,
      responseConfidence: 1,
      reason: "deterministic_upload_restriction",
      origin: "bypass",
    };
  }

  // 2. Restrição: Geração de figuras / diagramas gráficos
  if (en ? GRAPHIC_PATTERN_EN.test(text) : GRAPHIC_PATTERN_PT.test(text)) {
    return {
      mode: "direct",
      responseMode: "direct",
      answer: en
        ? "ConsBOT operates exclusively in text mode and does not generate figures, graphic diagrams, illustrations, or visual charts."
        : "O ConsBOT opera exclusivamente em modo textual e não gera figuras, diagramas gráficos, ilustrações ou esquemas visuais.",
      answerOrigin: "catalog",
      actions: [],
      confidence: 1,
      responseConfidence: 1,
      reason: "deterministic_graphic_restriction",
      origin: "bypass",
    };
  }

  // 3. Restrição: Delimitação de escopo documental (livros de terceiros / revistas no chat)
  if (en ? SCOPE_PATTERN_EN.test(text) : SCOPE_PATTERN_PT.test(text)) {
    return {
      mode: "direct",
      responseMode: "direct",
      answer: en
        ? "ConsBOT's document search corpus exclusively covers works authored by Waldo Vieira and Encyclopedia of Conscientiology entries (all authors), without chat access to other books or journal articles."
        : "O acervo documental de busca do ConsBOT abrange exclusivamente as obras de autoria de Waldo Vieira e os verbetes da Enciclopédia da Conscienciologia (de todos os autores), não tendo acesso no chat a outros livros nem a artigos de revistas/periódicos.",
      answerOrigin: "catalog",
      actions: [],
      confidence: 1,
      responseConfidence: 1,
      reason: "deterministic_scope_restriction",
      origin: "bypass",
    };
  }

  // Se a pergunta contiver questionamento conceitual amplo, não intercepta como direct;
  // o classificador LLM e modelo principal darão a resposta completa.
  if (isConceptualQuestion(text, en)) {
    return null;
  }

  // 4. Periódicos e Artigos de revistas (quando pedido ou navegação direta)
  if (en ? PERIODICOS_PATTERN_EN.test(text) : PERIODICOS_PATTERN_PT.test(text)) {
    const actions = actionsFromMatches(
      [{ intent: "open_resource", confidence: 0.98, term: "", resource: "periodicos" }],
      ctx,
    );
    return {
      mode: "direct",
      responseMode: "direct",
      answer: en
        ? "You can consult and search Conscientiology articles and journals directly at the Periodicals portal:"
        : "Você pode consultar e pesquisar os artigos e periódicos da Conscienciologia diretamente no portal de Periódicos:",
      answerOrigin: "catalog",
      actions,
      confidence: 0.98,
      responseConfidence: 0.98,
      reason: "deterministic_periodicos_direct",
      origin: "bypass",
    };
  }

  // 5. Livros completos em PDF / Google Drive (quando pedido ou navegação direta)
  if (en ? LIVROS_PDF_PATTERN_EN.test(text) : LIVROS_PDF_PATTERN_PT.test(text)) {
    const actions = actionsFromMatches(
      [{ intent: "open_resource", confidence: 0.98, term: "", resource: "livros_pdf" }],
      ctx,
    );
    return {
      mode: "direct",
      responseMode: "direct",
      answer: en
        ? "You can access and download Conscientiology books in PDF from the official Google Drive folder:"
        : "Você pode acessar e baixar as obras e livros da Conscienciologia em formato PDF na pasta oficial do Google Drive:",
      answerOrigin: "catalog",
      actions,
      confidence: 0.98,
      responseConfidence: 0.98,
      reason: "deterministic_livros_pdf_direct",
      origin: "bypass",
    };
  }

  return null;
}
