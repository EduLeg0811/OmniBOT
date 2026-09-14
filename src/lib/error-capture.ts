import { toast } from "sonner";

// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

// h3's HTTPError serializes to {"status":500,"unhandled":true,"message":"HTTPError"} —
// no stack, no cause — so a plain console.error(error) reaches the log pipeline with
// the failure detail stripped. Expand Error-like args into a string that keeps the
// message, stack, and the full cause chain.
const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }
    const label = depth === 0 ? "" : "caused by: ";
    const status = describeStatus(current);
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
    current = current.cause;
  }
  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

function describeStatus(error: Error): string {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (status ${value})` : "";
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

// Wrap console.error so errors logged by any layer — including h3's internal
// unhandled-error logging, which this file cannot hook directly — are both
// recorded for consumeLastCapturedError and expanded before serialization.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const expanded = args.map((arg) => {
    if (!isErrorLike(arg)) return arg;
    record(arg);
    return describeError(arg);
  });
  originalConsoleError(...expanded);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}

export interface TechnicalErrorDetails {
  name: string;
  message: string;
  stack?: string;
  cause?: string;
  statusCode?: number;
  description: string;
  raw: string;
  timestamp: string;
}

export function extractTechnicalErrorDetails(error: unknown): TechnicalErrorDetails {
  const isErr = error instanceof Error;
  const statusObj = error as { status?: unknown; statusCode?: unknown } | null;
  const statusVal = statusObj?.status ?? statusObj?.statusCode;
  const statusCode = typeof statusVal === "number" ? statusVal : undefined;

  const name = isErr
    ? error.name
    : typeof error === "object" && error !== null
      ? "ObjectError"
      : "Error";
  const message = isErr
    ? error.message
    : typeof error === "string"
      ? error
      : safeStringify(error);
  const stack = isErr ? error.stack : undefined;
  const cause =
    isErr && error.cause
      ? error.cause instanceof Error
        ? describeError(error.cause)
        : String(error.cause)
      : undefined;
  const description = describeError(error);
  const raw = stack || `${name}: ${message}`;

  return {
    name,
    message,
    stack,
    cause,
    statusCode,
    description,
    raw,
    timestamp: new Date().toISOString(),
  };
}

export const LLM_UNAVAILABLE_MESSAGE = {
  pt: {
    title: "Sistema indisponível no momento",
    description: "Por favor, tente novamente em instantes.",
  },
  en: {
    title: "System currently unavailable",
    description: "Please try again in a few moments.",
  },
} as const;

export function showLlmUnavailableToast(isEnglish = false) {
  const text = isEnglish ? LLM_UNAVAILABLE_MESSAGE.en : LLM_UNAVAILABLE_MESSAGE.pt;
  toast.error(text.title, {
    description: text.description,
  });
}

