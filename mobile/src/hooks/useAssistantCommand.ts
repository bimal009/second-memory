import { useCallback, useRef, useState } from "react";
import type { CapturePlan, Memory } from "@/types";
import { api } from "@/api";

export type AssistantCommandPhase =
  | "idle"
  | "sending"
  | "saved"
  | "error";

type CommandOutcome = {
  plan: CapturePlan | null;
  savedMemory: Memory | null;
};

/**
 * ROUND-TRIP for a recognized voice command on the Capture screen.
 *
 * TODO(backend): the recognition itself (always-listening "{name}, …" wake word,
 * real transcription) is a native/AI problem — this hook takes already-
 * transcribed text and hands it to the API layer. Swap `api` for the
 * FastAPI-backed client and nothing here changes.
 */
export function useAssistantCommand() {
  const [phase, setPhase] = useState<AssistantCommandPhase>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CommandOutcome>({
    plan: null,
    savedMemory: null,
  });
  const inflight = useRef(false);

  const submitCommand = useCallback(async (command: string, assistantName: string) => {
    if (!command.trim() || inflight.current) return;
    inflight.current = true;
    setTranscript(command.trim());
    setPhase("sending");
    try {
      const { plan, savedMemory } = await api.sendCaptureCommand({
        command,
        assistantName,
      });
      setOutcome({ plan, savedMemory });
      setPhase("saved");
    } catch {
      setPhase("error");
    } finally {
      inflight.current = false;
    }
  }, []);

  const resetCommand = useCallback(() => {
    setPhase("idle");
    setTranscript(null);
    setOutcome({ plan: null, savedMemory: null });
  }, []);

  return { phase, transcript, plan: outcome.plan, savedMemory: outcome.savedMemory, submitCommand, resetCommand };
}
