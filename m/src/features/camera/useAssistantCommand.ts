import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useRefreshMemories } from "@/api/useMemoryQuery";
import { useCapture } from "@/features/run/CaptureProvider";
import { captureCopy as c } from "@/constants/strings";
/** TODO(speech): replace seeded PTT words with a transcript. Only the API interprets intent; no real microphone access. Haptics only. */
export function useAssistantCommand(name: string, onStop: () => void) {
  const capture = useCapture(); const refresh = useRefreshMemories();
  const [listening, setListening] = useState(false); const [transcript, setTranscript] = useState(""); const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null); const sample = useRef<string>(c.commandExamples[0]); const generation = useRef(0);
  const request = useMutation({ mutationFn: async (command: string) => {
    const result = await api.interpretCommand(command, name);
    if (result.intent === "bookmark") { if (capture.status === "idle") throw new Error(c.startHint); await capture.bookmark(result.note); }
    if (result.intent === "reminder") await api.createReminder(result.text, result.due);
    if (result.intent === "control") { if (result.action === "pause") capture.pause(); else if (result.action === "resume") capture.resume(); else onStop(); }
    return result;
  }, onSuccess: () => { setVisible(true); refresh(); } });
  useEffect(() => { if (!visible) return; const timeout = setTimeout(() => setVisible(false), 3000); return () => clearTimeout(timeout); }, [visible]);
  useEffect(() => () => { generation.current++; if (timer.current) clearInterval(timer.current); }, []);
  const cancel = () => { generation.current++; if (timer.current) clearInterval(timer.current); setListening(false); setTranscript(""); };
  const start = () => {
    cancel(); setListening(true); setVisible(false); const token = generation.current;
    void api.getCommandExamples().then(examples => { if (token !== generation.current) return; sample.current = examples[0] ?? c.commandExamples[0]; const words = sample.current.split(" "); let count = 0; timer.current = setInterval(() => { count++; setTranscript(words.slice(0, count).join(" ")); if (count >= words.length && timer.current) clearInterval(timer.current); }, 180); });
  };
  const release = () => { generation.current++; if (timer.current) clearInterval(timer.current); setListening(false); request.mutate(sample.current); };
  return { ...request, listening, transcript, visible, start, release, cancel, send: (text: string) => { if (text.trim() && !request.isPending) { setVisible(false); request.mutate(text.trim()); } } };
}
