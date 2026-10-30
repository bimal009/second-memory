import React from "react";
import { Linking, Platform, View } from "react-native";
import { useCapture } from "@/features/run/CaptureProvider";
import { isDevice } from "expo-device";
import { CameraOff } from "lucide-react-native";
import { usePreviewState } from "@/api/client";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { darkColors, mediaColors } from "@/theme/tokens";
import { captureCopy as c, uiCopy as u } from "@/constants/strings";
export function PreviewFallback() {
  const capture = useCapture(); const { permission, requestPermission: request } = capture; const state = usePreviewState();
  if (permission?.granted && (isDevice || Platform.OS === "web") && state !== "denied" && !capture.previewFailed) return null;
  const denied = !permission?.granted || state === "denied";
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 12 }}><View style={{ backgroundColor: mediaColors.strongScrim, padding: 16, gap: 12, borderRadius: 10, alignItems: "center" }}><CameraOff accessible={false} size={32} color={darkColors.foreground} /><Text align="center" style={{ color: darkColors.foreground }}>{capture.previewFailed ? u.previewError : permission === null ? c.waitingPermission : denied ? u.permission : u.preview}</Text><Text variant="caption" align="center" style={{ color: darkColors.foreground }}>{denied ? c.permissionBody : c.mockUnavailable}</Text>{capture.previewFailed && <Button label={u.previewRetry} variant="onMedia" onPress={capture.retryPreview} />}{denied && <Button label={u.openCamera} variant="onMedia" onPress={() => { if (permission?.canAskAgain) void request(); else void Linking.openSettings().catch(() => {}); }} />}</View></View>;
}
