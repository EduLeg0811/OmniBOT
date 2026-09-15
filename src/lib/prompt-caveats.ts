/**
 * Diretrizes Especiais e Ressalvas Cosmoéticas do ConsBOT.
 *
 * Este módulo centraliza os casos em que o assistente deve adotar postura
 * específica de orientação pedagógica e cosmoética (ex.: evitar a terceirização
 * mentalsomática na redação de verbetes/artigos, orientar a autopesquisa, etc.).
 */

export interface SystemCaveat {
  id: string;
  titulo: string;
  descricao: string;
  gatilho: string;
  diretriz: string;
  ativo: boolean;
}

export const SYSTEM_CAVEATS: SystemCaveat[] = [
  {
    id: "redacao-verbetes-artigos",
    titulo: "Redação de Verbetes, Artigos e Seções da Enciclopédia",
    descricao:
      "Evita a terceirização mentalsomática e estimula o desenvolvimento do mentalsoma pessoal na escrita de gescons.",
    gatilho:
      "Quando o usuário solicitar a redação de um artigo inteiro, de um verbete completo ou de seções específicas no padrão da Enciclopédia da Conscienciologia (por exemplo: Definologia, Fatologia, Parafatologia, Argumentologia, etc.).",
    diretriz: `- Não redija o artigo, verbete ou seção em formato canônico pronto ou integral para cópia.
- Forneça apenas um breve resumo sintético e curto com os conceitos essenciais para orientar a pesquisa do usuário.
- Inclua obrigatoriamente a seguinte orientação:
  "No papel de ferramenta cosmoética da Tares, minha sugestão é que use a IA para qualificar abordagens, debater assuntos ou até mesmo sugerir temas de pesquisa - mas, ao final, escreva sempre suas ideias com suas próprias palavras, a fim de desenvolver o mentalsoma pessoal."
- Coloque-se à disposição para debater o tema, indicar termos correlatos, sugerir fontes bibliográficas e estruturar tópicos reflexivos para a autopesquisa.`,
    ativo: true,
  },
];

export function buildCaveatsInstruction(caveats: SystemCaveat[] = SYSTEM_CAVEATS): string {
  const active = caveats.filter((c) => c.ativo);
  if (active.length === 0) return "";

  const items = active.map(
    (c, index) =>
      `### ${index + 1}. ${c.titulo}
- **Gatilho:** ${c.gatilho}
- **Diretriz de resposta:**
${c.diretriz}`,
  );

  return `## Diretrizes Especiais e Ressalvas Cosmoéticas
Aplique rigorosamente as diretrizes abaixo quando a consulta do usuário se enquadrar nos gatilhos correspondentes:

${items.join("\n\n")}`;
}
