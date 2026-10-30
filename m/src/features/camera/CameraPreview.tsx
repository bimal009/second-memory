import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { CameraView } from "expo-camera";
import { isDevice } from "expo-device";
import { usePreviewState } from "@/api/client";
import { darkColors, mediaColors } from "@/theme/tokens";
import { useCapture } from "@/features/run/CaptureProvider";
/** One preview at the pager root. Page changes and sheets never change its identity. No recording API is called. */
export function CameraPreview() {
  const capture = useCapture(); const { permission, previewFailed } = capture; const state = usePreviewState(); const hadPermission = useRef(false);
  useEffect(() => { if (hadPermission.current && permission && !permission.granted) capture.fail(); hadPermission.current = !!permission?.granted; }, [permission, capture.fail]);
  const available = !!permission?.granted && (Platform.OS === "web" || isDevice) && state !== "denied" && !previewFailed;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: darkColors.background }]}>
    {available && capture.foreground && capture.status !== "paused" && capture.status !== "background_paused" && capture.status !== "error" && <CameraView facing={capture.facing} enableTorch={capture.flash && capture.facing === "back"} style={StyleSheet.absoluteFill} onMountError={() => { capture.setPreviewFailed(true); capture.fail(); }} />}
    {capture.dim && <View style={[StyleSheet.absoluteFill, { backgroundColor: mediaColors.dimScrim }]} />}
  </View>;
}
