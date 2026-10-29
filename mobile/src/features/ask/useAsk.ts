import { useCallback, useRef, useState } from "react";
import type { AskResult, MemoryLocation } from "@/types";
import { api } from "@/api";
import { exampleQuestions } from "@/mocks/data";

export type AskPhase = "idle" | "thinking" | "answer" | "not-found" | "error";

type AskState = {
  phase: AskPhase;
  question: string;
  result: AskResult | null;
  location: MemoryLocation | null;
};

/**
 * Round-trip for questions.
 *
 * TODO(backend): real voice recognition happens natively; the hook takes
 * transcribed text (hold-to-ask releases with a mock transcript for now).
 */
export function useAsk() {
  const [state, setState] = useState<AskState>({
    phase: "idle",
    question: "",
    result: null,
    location: null,
  });
  const inflight = useRef(false);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || inflight.current) return;
    inflight.current = true;
    setState({ phase: "thinking", question: q, result: null, location: null });
    try {
      const result = await api.ask(q, "");
      let location: MemoryLocation | null = null;
      if (result.kind === "answer") {
        const memory = await api.getMemory(result.answer.citedMemoryId);
        location = memory?.location ?? null;
      }
      setState({
        phase: result.kind === "answer" ? "answer" : "not-found",
        question: q,
        result,
        location,
      });
    } catch {
      setState((s) => ({ ...s, phase: "error" }));
    } finally {
      inflight.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ phase: "idle", question: "", result: null, location: null });
  }, []);

  return {
    ...state,
    suggestions:
      state.result?.kind === "not-found" ? state.result.suggestions : exampleQuestions,
    ask,
    reset,
  };
}
