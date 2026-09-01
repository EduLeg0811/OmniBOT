import { AGENT_TARGETS } from "@/agent/config";
import type { AgentTool } from "@/agent/types";

/** Direcionamento complementar ao acervo e aos painéis do ICGE. */
export const acervoIcge: AgentTool = {
  name: "acervo_icge",
  termRequired: false,

  describe: (english) =>
    english
      ? "acervo_icge — add this action for questions about the holotheca, historical archives, artifacts, Conscientiocentric Institutions, CCCI memory, videos, events, statistics or collections maintained or indexed by ICGE. ALWAYS choose full so the main model answers the question; this action is only a complementary link. Do NOT replace the answer with navigation. Return an empty term."
      : "acervo_icge — inclua esta action em perguntas sobre holoteca, arquivos históricos, artefatos, Instituições Conscienciocêntricas, memória da CCCI, vídeos, eventos, estatísticas ou acervos mantidos ou indexados pelo ICGE. Escolha SEMPRE full para o modelo principal responder à pergunta; esta action é apenas um link complementar. NÃO substitua a resposta por navegação. Retorne term vazio.",

  toAction: (_match, { host }) => ({
    id: "acervo_icge",
    kind: "open-url",
    label: host.english ? "Consult the ICGE collection" : "Consultar acervo do ICGE",
    title: host.english ? "Opens the ICGE website in a new tab" : "Abre o site do ICGE em nova aba",
    href: AGENT_TARGETS.acervo_icge,
  }),

  execute: async () => ({
    intent: "acervo_icge",
    term: "",
    total: 0,
    saturated: false,
    items: [],
  }),
};
