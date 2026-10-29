import React, { createContext, lazy, Suspense, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Platform, Pressable } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import type { RecordingController } from "./RecordingController";
import type { RecordingSnapshot } from "./types";
import { missingRecordingModules } from "./capabilities";

export const RecordingContext = createContext<RecordingController | null>(null);
// Importing expo-audio/network/filesystem eagerly crashes older development builds.
const NativeRuntime = lazy(() => import("./NativeRecordingProvider"));
export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [missing] = useState(() => Platform.OS === "web" ? [] : missingRecordingModules(requireOptionalNativeModule));
  return Platform.OS === "web" || missing.length ? children : <Suspense fallback={children}><NativeRuntime>{children}</NativeRuntime></Suspense>;
}
export function RecordingGate({ enabled }: { enabled: boolean }) {
  const controller = useContext(RecordingContext);
  const state = useRecordingState();
  useEffect(() => { if (state?.ready) void controller?.setEnabled(enabled).catch(() => {}); }, [controller, state?.ready, enabled]);
  return null;
}
export const useRecordingController = () => useContext(RecordingContext);
const subscribeNone = () => () => {};
const getNone = () => null;
export function useRecordingState(): RecordingSnapshot | null {
  const controller = useContext(RecordingContext);
  return useSyncExternalStore(controller?.subscribe ?? subscribeNone, controller?.getSnapshot ?? getNone, controller?.getSnapshot ?? getNone);
}
export function SessionRunningBanner() {
  const state = useRecordingState();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!state?.session || ["idle", "result"].includes(state.session.phase)) return null;
  const seconds = Math.floor(state.sessionSeconds);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Session running ${clock}, tap to open`} onPress={() => router.push("/session")} style={{ minHeight: insets.top + 40, paddingTop: insets.top, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, backgroundColor: colors.primary }}><Text variant="caption" color="primaryForeground">Session {state.session.phase === "paused" ? "paused" : "running"} {clock}, tap to open</Text></Pressable>;
}
