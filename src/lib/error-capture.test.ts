import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import {
  describeError,
  extractTechnicalErrorDetails,
  LLM_UNAVAILABLE_MESSAGE,
  showLlmUnavailableToast,
} from "@/lib/error-capture";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("error-capture", () => {
  it("describes standard errors and causes", () => {
    const root = new Error("connection reset");
    const parent = new Error("failed to fetch LLM stream", { cause: root });
    const description = describeError(parent);

    expect(description).toContain("failed to fetch LLM stream");
    expect(description).toContain("caused by:");
    expect(description).toContain("connection reset");
  });

  it("extracts technical error details from Error instance", () => {
    const error = new Error("Rate limit reached");
    error.name = "RateLimitError";
    (error as unknown as { status: number }).status = 429;

    const details = extractTechnicalErrorDetails(error);

    expect(details.name).toBe("RateLimitError");
    expect(details.message).toBe("Rate limit reached");
    expect(details.statusCode).toBe(429);
    expect(details.stack).toBeDefined();
    expect(details.description).toContain("RateLimitError: Rate limit reached");
    expect(details.timestamp).toBeDefined();
  });

  it("extracts technical details from string and unknown values", () => {
    const stringDetails = extractTechnicalErrorDetails("Unexpected server outage");
    expect(stringDetails.name).toBe("Error");
    expect(stringDetails.message).toBe("Unexpected server outage");

    const objectDetails = extractTechnicalErrorDetails({ code: 500, detail: "Backend crash" });
    expect(objectDetails.name).toBe("ObjectError");
    expect(objectDetails.message).toContain("Backend crash");
  });

  it("shows elegant toast for pt-BR and English", () => {
    showLlmUnavailableToast(false);
    expect(toast.error).toHaveBeenCalledWith(LLM_UNAVAILABLE_MESSAGE.pt.title, {
      description: LLM_UNAVAILABLE_MESSAGE.pt.description,
    });

    showLlmUnavailableToast(true);
    expect(toast.error).toHaveBeenCalledWith(LLM_UNAVAILABLE_MESSAGE.en.title, {
      description: LLM_UNAVAILABLE_MESSAGE.en.description,
    });
  });
});
