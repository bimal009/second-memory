import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { router, usePathname } from "expo-router";
import { useSessionRecorder } from "@/features/session/useSessionRecorder";
import { useSettings, useRefreshMemories } from "@/api/useMemoryQuery";
import { uiCopy as c } from "@/constants/strings";
import type { Session } from "@/types/session";
import { cameraCanRun } from "@/features/camera/policy";
type PageIndex = 0 | 1 | 2;
function usePagerValue() {
  const [pageIndex, setPageIndex] = useState<PageIndex>(1);
  const [overlay, setOverlay] = useState<"memories" | "settings" | null>(null);
  const [privacyPaused, setPrivacyPaused] = useState(false);
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [dragging, setDragging] = useState(false);
  const pathname = usePathname();
  const settings = useSettings(); const refresh = useRefreshMemories();
  const onSessionReady = useCallback((session: Session) => {
    refresh(); setOverlay("memories");
    router.push({ pathname: "/session/[id]", params: { id: session.id } });
  }, [refresh]);
  const session = useSessionRecorder(onSessionReady, settings.data?.keepLocalRecording);
  useEffect(() => { const sub = AppState.addEventListener("change", next => setForeground(next === "active")); return () => sub.remove(); }, []);
  const routeFocused = pathname === "/capture" || pathname === "/(tabs)/capture";
  const focused = pageIndex === 1 && routeFocused && foreground && !overlay && !dragging;
  const reason = session.active ? c.reasonSession : !foreground ? c.reasonBackground : overlay || !routeFocused ? c.reasonOverlay : pageIndex !== 1 || dragging ? c.reasonAway : privacyPaused || settings.data?.recordingPaused ? c.reasonPrivacy : settings.isPending ? c.reasonLoading : settings.error ? c.reasonError : !previewAvailable ? c.reasonPermission : null;
  const isCameraActive = cameraCanRun({ cameraPage: pageIndex === 1, routeFocused, foreground, overlay: !!overlay, dragging, session: session.active, paused: privacyPaused || !!settings.data?.recordingPaused, previewAvailable, settingsReady: !!settings.data });
  const goTo = useCallback((page: PageIndex) => { setOverlay(null); setPageIndex(page); }, []);
  const openMemories = useCallback(() => setOverlay("memories"), []);
  const openSettings = useCallback(() => setOverlay("settings"), []);
  const closeOverlay = useCallback(() => setOverlay(null), []);
  return useMemo(() => ({ pageIndex, goTo, onPageSelected: setPageIndex, setDragging, overlay, openMemories, openSettings, closeOverlay, isCameraActive, isSessionActive: session.active, session, focused, routeFocused, reason, privacyPaused, setPrivacyPaused, setPreviewAvailable, settings }), [pageIndex, goTo, overlay, openMemories, openSettings, closeOverlay, isCameraActive, session, focused, routeFocused, reason, privacyPaused, settings]);
}
const PagerContext = createContext<ReturnType<typeof usePagerValue> | null>(null);
export function AppPagerProvider({ children }: React.PropsWithChildren) { const value = usePagerValue(); return <PagerContext.Provider value={value}>{children}</PagerContext.Provider>; }
export function useAppPager() { const value = useContext(PagerContext); if (!value) throw new Error("AppPagerProvider is required"); return value; }
