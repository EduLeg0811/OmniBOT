import { AGENT_TARGETS } from "@/agent/config";
import type { AgentTool } from "@/agent/types";

/** Apoio institucional à escrita e submissão de verbetes. */
export const encyclossapiens: AgentTool = {
  name: "encyclossapiens",
  termRequired: false,

  describe: (english) =>
    english
      ? "encyclossapiens — add this action when the user asks about rules, criteria, structure, style, title approval or submission of Encyclopedia of Conscientiology entries, or explicitly asks to open the Encyclossapiens website. For substantive questions choose full and keep this action as a complementary link; use direct only for a purely navigational request. Do NOT use it to search entry contents (search_verbete) or format bibliographic references (bibliografia_verbetes). Return an empty term."
      : "encyclossapiens — inclua esta action quando o usuário perguntar sobre regras, critérios, estrutura, estilo, aprovação de título ou submissão de verbetes da Enciclopédia da Conscienciologia, ou pedir explicitamente para abrir o site da Encyclossapiens. Em dúvidas de conteúdo escolha full e mantenha esta action como link complementar; use direct somente em pedido puramente navegacional. NÃO use para buscar conteúdo de verbetes (search_verbete) nem para montar referências (bibliografia_verbetes). Retorne term vazio.",

  toAction: (_match, { host }) => ({
    id: "encyclossapiens",
    kind: "open-url",
    label: host.english ? "Encyclossapiens writing resources" : "Recursos da Encyclossapiens",
    title: host.english
      ? "Opens the verbete-writing resources in a new tab"
      : "Abre os recursos para escrita de verbetes em nova aba",
    href: AGENT_TARGETS.encyclossapiens,
  }),

  execute: async () => ({
    intent: "encyclossapiens",
    term: "",
    total: 0,
    saturated: false,
    items: [],
  }),
};
