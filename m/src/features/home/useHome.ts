import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveMemory, type CaptureDraft } from "@/api";
import { useRecordingController, useRecordingState } from "@/features/recording/RecordingProvider";

export function useHome() {
  const controller = useRecordingController();
  const state = useRecordingState();
  const client = useQueryClient();
  const [override, setDraft] = useState<CaptureDraft | null>(null);
  const [saved, setSaved] = useState(false);
  const draft = override ?? state?.plan ?? null;
  const save = useMutation({ mutationFn: saveMemory, onSuccess: () => {
    setDraft(null); controller?.dismissPlan(); setSaved(true);
    void client.invalidateQueries({ queryKey: ["demo"] });
  } });
  useEffect(() => { if (!saved) return; const timer = setTimeout(() => setSaved(false), 3000); return () => clearTimeout(timer); }, [saved]);
  const error = save.error ?? (state?.error ? new Error(state.error) : controller?.queue.error ? new Error(controller.queue.error) : null);
  return {
    state, controller,
    buffer: { data: { seconds: state?.bufferSeconds ?? 0, capacity: 120, recording: state?.bufferRecording ?? false }, isPending: !!state && !state.ready },
    draft, setDraft, saved, saveDraft: (value: CaptureDraft | null = draft) => { if (value) save.mutate(value); },
    toggleRecording: () => { void controller?.toggleBuffer().catch(() => {}); },
    busy: save.isPending || !!state && ["preparing", "recording", "processing"].includes(state.commandPhase),
    processing: state?.commandPhase === "processing", saving: save.isPending, error,
    retry: () => { if (save.error && draft) save.mutate(draft); else controller?.retry(); },
    discard: () => { setDraft(null); controller?.dismissPlan(); save.reset(); setSaved(false); },
  };
}
