/**
 * Avaliação ao vivo da geração de perguntas de acompanhamento.
 *
 * npm run agent:follow-up-suite
 * npm run agent:follow-up-suite -- --case nova-obra
 *
 * Requer o Main-Server. A avaliação usa o mesmo prompt, schema e seletor local
 * do app e mede separadamente elegibilidade, seleção, âncora e duplicidade.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { FOLLOW_UP_CASES } from "./agent-follow-up-cases.mjs";

const ROOT = process.cwd();
const API_BASE = (process.env.VITE_MAIN_SERVER_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const MODEL = "gpt-5.6-luna";
const ONLY = process.argv[process.argv.indexOf("--case") + 1] || "";

async function loadFollowUp() {
  const dir = await mkdtemp(join(tmpdir(), "follow-up-suite-"));
  const entry = join(dir, "entry.ts");
  const out = join(dir, "follow-up.mjs");
  await writeFile(
    entry,
    [
      'export { AGENT_FOLLOW_UP_CONFIG, AGENT_FOLLOW_UP_SCHEMA } from "@/agent/follow-up";',
      'export { agentFollowUpEligibility, agentFollowUpPrompt } from "@/agent/follow-up";',
      'export { selectAgentFollowUp } from "@/agent/follow-up";',
    ].join("\n"),
  );
  const bundle = await rolldown({
    input: entry,
    resolve: { alias: { "@": join(ROOT, "src") } },
    platform: "node",
  });
  await bundle.write({ file: out, format: "esm" });
  await bundle.close();
  return {
    module: await import(pathToFileURL(out).href),
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

async function generate(followUp, testCase) {
  const context = {
    userQuestion: testCase.userQuestion,
    previousUserQuestion: testCase.previousUserQuestion,
    assistantResponse: testCase.assistantResponse,
    actions: testCase.actions,
    recentTurns: testCase.recentTurns ?? [],
  };
  const response = await fetch(`${API_BASE}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(followUp.AGENT_FOLLOW_UP_CONFIG.timeoutMs),
    body: JSON.stringify({
      messages: [
        { role: "user", content: followUp.agentFollowUpPrompt(context, !!testCase.english) },
      ],
      model: MODEL,
      reasoningEffort: "none",
      verbosity: "low",
      responseSchema: followUp.AGENT_FOLLOW_UP_SCHEMA,
      responseSchemaName: "agent_follow_up",
      promptCacheKey: testCase.english ? "agent-follow-up-v3-en" : "agent-follow-up-v3-pt",
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  let payload;
  try {
    payload = JSON.parse(body.content ?? "{}");
  } catch {
    payload = {};
  }
  return followUp.selectAgentFollowUp(payload, context);
}

async function main() {
  const health = await fetch(`${API_BASE}/api/health`).catch(() => null);
  if (!health?.ok) throw new Error(`Main-Server fora do ar em ${API_BASE}`);
  const { module: followUp, cleanup } = await loadFollowUp();
  const cases = ONLY ? FOLLOW_UP_CASES.filter((item) => item.id === ONLY) : FOLLOW_UP_CASES;
  if (!cases.length) throw new Error(`Caso desconhecido: ${ONLY}`);
  let failures = 0;
  try {
    for (const testCase of cases) {
      const eligibility = followUp.agentFollowUpEligibility({
        enabled: true,
        responseMode: "full",
        userQuestion: testCase.userQuestion,
        assistantResponse: testCase.assistantResponse,
        displayedFollowUpCount: testCase.displayedFollowUpCount ?? 0,
      });
      const result = eligibility.eligible
        ? await generate(followUp, testCase)
        : { selection: null, candidateCount: 0, rejections: [], reason: eligibility.reason };
      const passed = Boolean(result.selection) === testCase.expectSelection;
      if (!passed) failures += 1;
      const selected = result.selection
        ? `${result.selection.question} [${result.selection.dimension}; âncora: ${result.selection.anchor}]`
        : "sem pill";
      console.log(
        `${passed ? "PASS" : "FAIL"} ${testCase.id}: ${selected}; candidatas=${result.candidateCount}; rejeições=${JSON.stringify(result.rejections)}`,
      );
    }
  } finally {
    await cleanup();
  }
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
