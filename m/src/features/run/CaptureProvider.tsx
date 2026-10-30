import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import { useKeepAwake } from "expo-keep-awake";
import { useSettings } from "@/api/useMemoryQuery";
import { useLocation } from "@/features/camera/useLocation";
import { useChunkRecorder } from "./useChunkRecorder";
function KeepAwake() { useKeepAwake("second-memory-capture"); return null; }
function useCaptureValue() {
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const [previewFailed, setPreviewFailed] = useState(false);
  const settings = useSettings(); const location = useLocation(settings.data?.locationEnabled ?? true);
  const recorder = useChunkRecorder(settings.data?.chunkLength ?? 30, settings.data?.keepLocalRecording ?? false, location.data);
  const { pause } = recorder;
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [facing, setFacing] = useState<"front" | "back">("back"); const [flash, setFlash] = useState(false); const [dim, setDim] = useState(false);
  useEffect(() => { const sub = AppState.addEventListener("change", next => { setForeground(next === "active"); if (next !== "active") pause(true); else { setPreviewFailed(false); void refreshPermission(); } }); return () => sub.remove(); }, [pause, refreshPermission]);
  useEffect(() => { if (!foreground && recorder.status === "capturing") pause(true); }, [foreground, recorder.status, pause]);
  useEffect(() => { if (recorder.finished) { const id = recorder.finished.id; recorder.clearFinished(); router.push({ pathname: "/run/[id]", params: { id } }); } }, [recorder.finished]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...recorder, permission, requestPermission, previewFailed, setPreviewFailed, retryPreview: () => { setPreviewFailed(false); void refreshPermission(); }, settings, foreground, facing, flip: () => setFacing(v => v === "back" ? "front" : "back"), flash, toggleFlash: () => setFlash(v => !v), dim, toggleDim: () => setDim(v => !v) };
}
const CaptureContext = createContext<ReturnType<typeof useCaptureValue> | null>(null);
export function CaptureProvider({ children }: React.PropsWithChildren) { const value = useCaptureValue(); return <CaptureContext.Provider value={value}>{value.status === "capturing" && <KeepAwake />}{children}</CaptureContext.Provider>; }
export const useOptionalCapture = () => useContext(CaptureContext);
export function useCapture() { const value = useContext(CaptureContext); if (!value) throw new Error("CaptureProvider is required"); return value; }
