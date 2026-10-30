import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useRefreshMemories } from "@/api/useMemoryQuery";
import { uiCopy as c } from "@/constants/strings";
/** TODO(speech): replace simulated transcript with push-to-talk recognition. TODO(chime): play a short save confirmation. */
export function useAssistantCommand(name: string) {
  const [listening, setListening] = useState(false); const [transcript, setTranscript] = useState(""); const [visible, setVisible] = useState(false);
  const refresh = useRefreshMemories(); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useMutation({ mutationFn: (command: string) => api.sendCaptureCommand({ command, assistantName: name }), onSuccess: () => { refresh(); setVisible(true); } });
  useEffect(() => { if (!visible) return; const timeout = setTimeout(() => { setVisible(false); setTranscript(""); }, 3000); return () => clearTimeout(timeout); }, [visible]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); setListening(false); setTranscript(""); };
  return { ...request, listening, transcript, visible, save: () => { setVisible(false); request.mutate(c.liveTranscript); }, start: () => { setListening(true); setTranscript(""); timer.current = setTimeout(() => setTranscript(c.liveTranscript), 650); }, release: () => { if (timer.current) clearTimeout(timer.current); setListening(false); request.mutate(c.liveTranscript); }, cancel };
}
