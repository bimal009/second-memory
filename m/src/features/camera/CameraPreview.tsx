import React, { useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { isDevice } from "expo-device";
import { CameraOff } from "lucide-react-native";
import { usePreviewState } from "@/api/client";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { darkColors, mediaColors } from "@/theme/tokens";
import { uiCopy as c } from "@/constants/strings";
import { useAppPager } from "@/features/pager/AppPagerProvider";
export function CameraPreview({ facing, flash, dim }: { facing: "front" | "back"; flash: boolean; dim: boolean }) {
  const [permission] = useCameraPermissions(); const [failed, setFailed] = useState(false); const state = usePreviewState(); const pager = useAppPager();
  const available = !!permission?.granted && (Platform.OS === "web" || isDevice) && state !== "denied" && !failed;
  useEffect(() => { pager.setPreviewAvailable(available); return () => pager.setPreviewAvailable(false); }, [available, pager.setPreviewAvailable]);
  // Session preview is the explicit session exception. It never starts a rolling buffer.
  const show = available && (pager.isCameraActive || (pager.isSessionActive && pager.focused));
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: darkColors.background }]}>
    {show && <CameraView facing={facing} enableTorch={flash && facing === "back"} style={StyleSheet.absoluteFill} onMountError={() => setFailed(true)} />}
    {!available && <View style={styles.placeholder}><View style={styles.outline}><CameraOff accessible={false} size={32} color={darkColors.mutedForeground} /></View><View style={[styles.card, { backgroundColor: mediaColors.strongScrim }]}><Text variant="heading" style={styles.text}>{failed ? c.previewError : !permission?.granted || state === "denied" ? c.permission : c.preview}</Text><Text variant="caption" align="center" style={{ color: darkColors.mutedForeground }}>{!permission?.granted || state === "denied" ? c.permissionBody : c.previewBody}</Text>{failed ? <Button label={c.previewRetry} variant="onMedia" onPress={() => setFailed(false)} /> : !permission?.granted && Platform.OS !== "web" ? <Button label={c.openCamera} variant="onMedia" onPress={() => { void Linking.openSettings().catch(() => {}); }} /> : null}</View></View>}
    {dim && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: mediaColors.dimScrim }]} />}
  </View>;
}
const styles = StyleSheet.create({ placeholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 24 }, outline: { width: 88, height: 88, borderWidth: 1, borderColor: darkColors.border, borderRadius: 24, alignItems: "center", justifyContent: "center" }, card: { maxWidth: 340, gap: 12, padding: 16, borderRadius: 10 }, text: { color: darkColors.foreground, textAlign: "center" } });
