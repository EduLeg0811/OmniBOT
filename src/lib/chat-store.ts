import { DEFAULT_SETTINGS, type ChatSettings } from "@/lib/chat-settings";
import type { ConsBotUIMessage } from "@/lib/audit-log";

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ConsBotUIMessage[];
  settings: ChatSettings;
};

const THREADS_KEY = "consbot:threads:v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function newId(): string {
  if (isBrowser() && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function normalize(raw: unknown): ChatThread | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<ChatThread>;
  if (typeof t.id !== "string") return null;
  const messages = Array.isArray(t.messages) ? (t.messages as ConsBotUIMessage[]) : [];
  return {
    id: t.id,
    title: typeof t.title === "string" && t.title.trim() ? t.title : "Nova conversa",
    updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now(),
    messages,
    // As settings são de sessão: toda carga da página parte do padrão, e o
    // que estiver gravado (por uma versão anterior) é ignorado de propósito.
    // Por isso não há validação de model/vectorStoreId/responseFormat aqui —
    // o padrão é válido por construção.
    settings: { ...DEFAULT_SETTINGS },
  };
}

export const MAX_STORED_THREADS = 20;
export const MAX_CONTEXT_RECENT_TURNS = 5;

/**
 * Poda o histórico de mensagens para envio ao modelo LLM usando a estratégia
 * "Âncora + Últimos N turnos" (por padrão, 5 turnos).
 *
 * Mantém:
 * 1. O primeiro turno (primeira pergunta do usuário e respectiva resposta do assistente,
 *    que ancora o assunto/contexto inicial da conversa).
 * 2. Os últimos `maxRecentTurns` turnos (perguntas e respostas mais recentes,
 *    incluindo a pergunta atual sendo despachada).
 *
 * O miolo intermediário é omitido para economia de tokens e foco da LLM,
 * preservando a ordem cronológica e a alternância entre usuário e assistente.
 */
export function trimMessagesForContext<T extends { role: string }>(
  messages: T[],
  maxRecentTurns = MAX_CONTEXT_RECENT_TURNS,
): T[] {
  if (!messages || messages.length === 0) return [];
  if (maxRecentTurns <= 0) return messages;

  const userIndices: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    const item = messages[i];
    if (item && item.role === "user") {
      userIndices.push(i);
    }
  }

  // Se o total de perguntas for menor ou igual aos turnos recentes solicitados,
  // devolve o histórico completo sem poda.
  if (userIndices.length <= maxRecentTurns) {
    return messages;
  }

  // Ponto de corte dos turnos mais recentes (os últimos `maxRecentTurns` turnos)
  const recentStartIndex = userIndices[userIndices.length - maxRecentTurns];
  if (recentStartIndex === undefined) {
    return messages;
  }

  const recentMessages = messages.slice(recentStartIndex);

  // Âncora: primeiro turno (primeira mensagem de usuário e respectiva resposta, se houver)
  const firstUserIndex = userIndices[0];
  if (firstUserIndex === undefined) {
    return messages;
  }

  const firstUserMessage = messages[firstUserIndex];
  if (!firstUserMessage) {
    return messages;
  }

  const leadingMessages = messages.slice(0, firstUserIndex);
  const anchorMessages: T[] = [...leadingMessages, firstUserMessage];

  const candidateAssistant = messages[firstUserIndex + 1];
  if (
    firstUserIndex + 1 < recentStartIndex &&
    candidateAssistant &&
    candidateAssistant.role === "assistant"
  ) {
    anchorMessages.push(candidateAssistant);
  }

  return [...anchorMessages, ...recentMessages];
}

export function loadThreads(): ChatThread[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalize)
      .filter((t): t is ChatThread => t !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_STORED_THREADS);
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]) {
  if (!isBrowser()) return;
  // `settings` fica de fora: os ajustes do menu de configuração valem só para
  // a sessão em curso. Gravá-los e depois ignorá-los na leitura daria no
  // mesmo, mas deixaria no localStorage um estado que nada relê — e que
  // pareceria autoritativo para quem fosse inspecioná-lo depois.
  const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  let count = Math.min(sorted.length, MAX_STORED_THREADS);

  while (count > 0) {
    try {
      const persistable = sorted
        .slice(0, count)
        .map(({ settings: _settings, ...thread }) => thread);
      window.localStorage.setItem(THREADS_KEY, JSON.stringify(persistable));
      return;
    } catch (error) {
      // Se estourar a cota (QuotaExceededError), reduz gradualmente o número de conversas mantidas
      count = Math.floor(count / 2);
      if (count === 0) {
        console.warn("Falha ao persistir conversas no localStorage:", error);
      }
    }
  }
}

export function createThread(initialSettings?: ChatSettings): ChatThread {
  return {
    id: newId(),
    title: "Nova conversa",
    updatedAt: Date.now(),
    messages: [],
    settings: initialSettings ? { ...initialSettings } : { ...DEFAULT_SETTINGS },
  };
}

/** Garante que exista uma thread e devolve a lista + o id ativo desejado. */
export function ensureThread(
  requestedId?: string,
  initialSettings?: ChatSettings,
): { threads: ChatThread[]; activeId: string } {
  const threads = loadThreads();
  if (requestedId && threads.some((t) => t.id === requestedId)) {
    return { threads, activeId: requestedId };
  }
  if (!requestedId && threads.length > 0) {
    return { threads, activeId: threads[0]!.id };
  }
  const thread = requestedId
    ? { ...createThread(initialSettings), id: requestedId }
    : createThread(initialSettings);
  const next = [thread, ...threads].slice(0, MAX_STORED_THREADS);
  saveThreads(next);
  return { threads: next, activeId: thread.id };
}

export function upsertThread(threads: ChatThread[], thread: ChatThread): ChatThread[] {
  const exists = threads.some((t) => t.id === thread.id);
  const next = exists
    ? threads.map((t) => (t.id === thread.id ? thread : t))
    : [thread, ...threads];
  return next.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_STORED_THREADS);
}

export function deleteThread(threads: ChatThread[], id: string): ChatThread[] {
  return threads.filter((t) => t.id !== id);
}

export function clearAllThreads() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(THREADS_KEY);
}

export function titleFromMessages(messages: ConsBotUIMessage[]): string | null {
  const first = messages.find((m) => m.role === "user");
  if (!first) return null;
  const text = first.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")
    .trim();
  if (!text) return null;
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}
