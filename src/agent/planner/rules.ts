import { actionsFromMatches } from "@/agent/tools/registry";
import type { AgentAction, AgentContext, AgentMatch } from "@/agent/types";

export const PERIODICOS_PATTERN_PT =
  /\b(?:artigos?(?:\s+cient[íi]ficos?)?|peri[oó]dicos?(?:\s+da\s+conscienciologia)?|revistas?(?:\s+cient[íi]ficas?)?|revista\s+conscientia)\b/iu;
export const PERIODICOS_PATTERN_EN =
  /\b(?:scientific\s+articles?|periodicals?|journals?|conscientia\s+journal)\b/iu;

export const LIVROS_PDF_PATTERN_PT =
  /\b(?:livro\w*|obra\w*|tratado\w*|manual|l[ée]xico)\b.*(?:pdf|baixar|download|completo|integral|google\s+drive|drive|link)|\b(?:pdf|baixar|download|google\s+drive|drive)\b.*(?:livro\w*|obra\w*|tratado\w*|manual|l[ée]xico)|\b(?:onde|como)\s+(?:acho|encontro|acesso|baixo|est[áa]|fica|tem).*(?:livro\w*|obra\w*|tratado\w*|pdf)/iu;
export const LIVROS_PDF_PATTERN_EN =
  /\b(?:books?|works?|treatises?).*(?:pdf|download|full|complete|google\s+drive)\b|\b(?:download|pdf).*(?:books?|works?)\b/iu;

/** Retorna ações determinísticas aplicáveis à mensagem para sugerir pills pertinentes, sem jamais suprimir a resposta da LLM. */
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
