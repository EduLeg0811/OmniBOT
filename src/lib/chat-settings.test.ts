import { describe, expect, it } from "vitest";

import { normalizeAgentSettings } from "@/agent";
import {
  CONSCIENTIOLOGICAL_WORD_OFFSET,
  DEFAULT_SETTINGS,
  MODELS,
  SYSTEM_CAVEATS,
  buildCaveatsInstruction,
  buildSystemPrompt,
  modelsFor,
  normalizeReasoningEffortForModel,
  normalizeSemanticContextLimit,
  settingsForProfile,
  settingsForPublicUser,
  targetWordsForSettings,
  withProfile,
  type SystemCaveat,
} from "@/lib/chat-settings";

describe("chat settings", () => {
  it("oferece o Astra somente no catálogo administrativo", () => {
    expect(modelsFor(true).map((model) => model.id)).toContain("gpt-6-astra");
    expect(modelsFor(false).map((model) => model.id)).not.toContain("gpt-6-astra");
    expect(MODELS.find((model) => model.id === "gpt-6-astra")).toMatchObject({
      label: "ConsBOT Astra",
      adminOnly: true,
      supportsNoneReasoning: false,
    });
  });

  it("troca o raciocínio none por low ao selecionar Astra", () => {
    expect(normalizeReasoningEffortForModel("gpt-6-astra", "none")).toBe("low");
    expect(normalizeReasoningEffortForModel("gpt-6-astra", "high")).toBe("high");
    expect(normalizeReasoningEffortForModel("gpt-5.6-luna", "none")).toBe("none");
  });

  it("restaura o modelo do perfil quando uma configuração Astra chega ao modo público", () => {
    const settings = settingsForPublicUser({ ...DEFAULT_SETTINGS, model: "gpt-6-astra" });
    expect(settings.model).toBe("gpt-5.6-terra");
  });

  it("inicializa novas conversas com o preset padrão de introdutor", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      profile: "introdutor",
      retrievalMode: "standard",
      model: "gpt-5.6-terra",
      reasoningEffort: "low",
      vectorMaxResults: 5,
      responseFormat: "chatgpt",
      responseDepth: "synthetic",
    });
    expect(DEFAULT_SETTINGS.agent).toEqual({
      enabled: true,
      prompt: "",
      presentation: "classic",
      followUpSuggestions: true,
    });
  });

  it("mantém a busca padrão e inicia LO/DAC como fontes candidatas", () => {
    const settings = settingsForProfile("tutor");
    expect(settings.retrievalMode).toBe("standard");
    expect(settings.semanticSourceIds).toEqual(["lo", "dac"]);
    expect(settings.semanticContextLimit).toBe(10);
  });

  it("limita a recuperação documental ao intervalo de 1 a 200 citações", () => {
    expect(normalizeSemanticContextLimit(0)).toBe(1);
    expect(normalizeSemanticContextLimit(201)).toBe(200);
    expect(normalizeSemanticContextLimit(57.6)).toBe(58);
    expect(normalizeSemanticContextLimit(undefined)).toBe(10);
  });

  it("força modo padrão, remove fontes e mantém somente o Agent clássico para usuário público", () => {
    const settings = settingsForPublicUser({
      ...DEFAULT_SETTINGS,
      retrievalMode: "standard",
      semanticSourceIds: ["lo", "dac"],
      agent: {
        enabled: false,
        prompt: "instrução administrativa",
        presentation: "citations",
        followUpSuggestions: false,
      },
    });
    expect(settings.retrievalMode).toBe("standard");
    expect(settings.semanticSourceIds).toEqual([]);
    expect(settings.agent).toEqual({
      enabled: true,
      prompt: "",
      presentation: "classic",
      followUpSuggestions: true,
    });
  });

  it("normaliza o modo manual legado para busca padrão", () => {
    const settings = settingsForPublicUser({
      ...DEFAULT_SETTINGS,
      retrievalMode: "corpus" as never,
      semanticSourceIds: ["lo"],
    });
    expect(settings.retrievalMode).toBe("standard");
    expect(settings.semanticSourceIds).toEqual([]);
  });

  it("migra o modo manual legado ao trocar de perfil e preserva as fontes do Agent", () => {
    const settings = withProfile(
      { ...DEFAULT_SETTINGS, retrievalMode: "corpus" as never, semanticSourceIds: ["lo"] },
      "preceptor",
    );
    expect(settings.retrievalMode).toBe("standard");
    expect(settings.semanticSourceIds).toEqual(["lo"]);
  });

  it("normaliza conversas antigas para o Clássico, que é o padrão do Agent", () => {
    // Antes daqui saía "citations" para qualquer objeto parcial, contrariando
    // AGENT_SETTINGS_DEFAULT: a apresentação efetiva dependia de por qual
    // caminho as settings tinham passado.
    expect(normalizeAgentSettings({ enabled: true, prompt: "" }).presentation).toBe("classic");
    expect(
      normalizeAgentSettings({ enabled: true, prompt: "", presentation: "citations" }).presentation,
    ).toBe("citations");
    expect(normalizeAgentSettings({ enabled: true, prompt: "" }).followUpSuggestions).toBe(true);
  });

  it("acrescenta 200 palavras à meta quando o formato for conscienciological", () => {
    expect(CONSCIENTIOLOGICAL_WORD_OFFSET).toBe(200);

    const chatGptSettings = {
      ...DEFAULT_SETTINGS,
      responseFormat: "chatgpt" as const,
      responseDepth: "synthetic" as const,
    };
    expect(targetWordsForSettings(chatGptSettings)).toBe(300);

    const consSettings = {
      ...DEFAULT_SETTINGS,
      responseFormat: "conscienciological" as const,
      responseDepth: "synthetic" as const,
    };
    expect(targetWordsForSettings(consSettings)).toBe(500);

    const prompt = buildSystemPrompt(consSettings);
    expect(prompt).toContain("cerca de 500 palavras");
  });

  it("injeta as diretrizes e ressalvas cosmoéticas no system prompt", () => {
    const prompt = buildSystemPrompt(DEFAULT_SETTINGS);
    expect(prompt).toContain("## Diretrizes Especiais e Ressalvas Cosmoéticas");
    expect(prompt).toContain("Redação de Verbetes, Artigos e Seções da Enciclopédia");
    expect(prompt).toContain(
      "no papel de ferramenta cosmoética da Tares, a sugestão para o pesquisador é usar a IA para qualificar abordagens",
    );
  });

  it("injeta as limitações operacionais e fontes documentais no system prompt", () => {
    const prompt = buildSystemPrompt(DEFAULT_SETTINGS);
    expect(prompt).toContain("### Limitações Operacionais e Fontes Documentais");
    expect(prompt).toContain("Upload de arquivos");
    expect(prompt).toContain("Geração de figuras ou diagramas gráficos");
    expect(prompt).toContain("obras de autoria de **Waldo Vieira**");
    expect(prompt).toContain("Enciclopédia da Conscienciologia");
    expect(prompt).toContain("https://periodicos.conscienciologia.org.br/");
    expect(prompt).toContain("https://drive.google.com/drive/u/2/folders/1Mp6Zfhq-peIYlo9Js0wYRX2DnRjFYyUj");
  });

  it("permite compilar ressalvas customizadas e respeita flag de ativação", () => {
    const caveats: SystemCaveat[] = [
      {
        id: "caso-ativo",
        titulo: "Caso Ativo",
        descricao: "Descrição",
        gatilho: "Quando X ocorrer",
        diretriz: "Faça Y",
        ativo: true,
      },
      {
        id: "caso-inativo",
        titulo: "Caso Inativo",
        descricao: "Descrição",
        gatilho: "Quando Z ocorrer",
        diretriz: "Faça W",
        ativo: false,
      },
    ];
    const instruction = buildCaveatsInstruction(caveats);
    expect(instruction).toContain("Caso Ativo");
    expect(instruction).not.toContain("Caso Inativo");

    expect(buildCaveatsInstruction([])).toBe("");
    expect(buildCaveatsInstruction([{ ...caveats[0]!, ativo: false }])).toBe("");
  });
});
