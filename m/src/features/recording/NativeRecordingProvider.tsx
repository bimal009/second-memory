import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AppState, StyleSheet, View, useWindowDimensions } from "react-native";
import { CameraView } from "expo-camera";
import * as Network from "expo-network";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecordingController } from "./RecordingController";
import { LocalMediaRepository } from "./repository";
import { NativeMedia } from "./nativeMedia";
import { getSessionResult, prepareRecordedCommand, startSession, stopSession, uploadRecordedMedia } from "@/api";
import { readPermissions } from "@/lib/permissions";
import { useTheme } from "@/theme/ThemeProvider";
import { CameraBinding } from "./CameraBinding";
import { registerRecordingReset } from "./resetRegistry";
import { RecordingContext } from "./RecordingProvider";

export default function NativeRecordingProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [cameraMounted, setCameraMounted] = useState(false);
  const [camera] = useState(() => new CameraBinding(setCameraMounted));
  const attachCamera = useCallback((view: CameraView | null) => camera.attach(view), [camera]);
  const cameraReady = useCallback(() => camera.onReady(), [camera]);
  const cameraError = useCallback((error: { message: string }) => camera.onError(error), [camera]);
  const [controller] = useState(() => new RecordingController(new LocalMediaRepository(), new NativeMedia(camera), {
    upload: uploadRecordedMedia, startSession, stopSession, getSessionResult, prepareCapture: prepareRecordedCommand,
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  useEffect(() => {
    let active = true;
    const permissions = async () => {
      try { const result = await readPermissions(); if (active) await controller.setPermissions(result.camera.granted, result.microphone.granted); } catch { if (active) await controller.setPermissions(false, false); }
    };
    const unregisterReset = registerRecordingReset(() => controller.resetLocal());
    void controller.setForeground(AppState.currentState === "active").catch(() => {});
    void controller.initialize().then(permissions).catch(() => {});
    void Network.getNetworkStateAsync().then(network => controller.queue.setNetwork(network.isConnected !== false && network.isInternetReachable !== false, network.type === Network.NetworkStateType.WIFI)).catch(() => controller.queue.setNetwork(false, false));
    const network = Network.addNetworkStateListener(value => controller.queue.setNetwork(value.isConnected !== false && value.isInternetReachable !== false, value.type === Network.NetworkStateType.WIFI));
    const app = AppState.addEventListener("change", status => {
      if (status !== "active") void controller.setForeground(false).catch(() => {});
      else void permissions().then(() => controller.setForeground(true)).catch(() => {});
    });
    return () => { active = false; unregisterReset(); network.remove(); app.remove(); void controller.dispose().catch(() => {}); };
  }, [controller]);
  const home = pathname === "/capture" || pathname === "/" || pathname === "/home-preview";
  const expanded = home && state.owner === "command" && state.commandMode === "video";
  const sessionVideo = pathname === "/session" && state.session?.mode === "video" && state.session.phase === "recording";
  const visible = home || sessionVideo;
  return <RecordingContext.Provider value={controller}>
    {children}
    {cameraMounted && <View pointerEvents="none" style={{ position: "absolute", borderRadius: 16, overflow: "hidden", zIndex: 5, backgroundColor: colors.secondary, right: visible ? 24 : -600, top: insets.top + (sessionVideo ? 170 : 110), width: expanded || sessionVideo ? Math.min(width - 48, 400) : 92, height: expanded || sessionVideo ? 190 : 112 }}>
      <CameraView ref={attachCamera} mode="video" videoQuality="480p" mute={false} facing="back" style={StyleSheet.absoluteFill} onCameraReady={cameraReady} onMountError={cameraError} />
    </View>}
  </RecordingContext.Provider>;
}
