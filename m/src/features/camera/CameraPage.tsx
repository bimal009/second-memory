import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SwitchCamera, UserRound, ChevronUp, Flag } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Shutter } from "@/components/domain/Shutter";
import { ModeSwitcher } from "@/components/domain/ModeSwitcher";
import { RecordingPill } from "@/components/domain/RecordingPill";
import { useAppPager } from "@/features/pager/AppPagerProvider";
import { SessionControls } from "@/features/session/SessionControls";
import { clock } from "@/features/session/clock";
import { copy, uiCopy as c } from "@/constants/strings";
import { darkColors as colors, mediaColors } from "@/theme/tokens";
import { CameraPreview } from "./CameraPreview";
import { CameraTools } from "./CameraTools";
import { CaptureFeedback } from "./CaptureFeedback";
import { useRollingBuffer } from "./useRollingBuffer";
import { useAssistantCommand } from "./useAssistantCommand";
export function CameraPage() {
  const pager = useAppPager(); const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"moment" | "session">("moment"); const [facing, setFacing] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState(false); const [location, setLocation] = useState(true); const [dim, setDim] = useState(false); const [bookmark, setBookmark] = useState(false);
  const settings = pager.settings.data; const name = settings?.assistantName.trim() || c.fallbackName;
  const buffer = useRollingBuffer(pager.isCameraActive, settings?.bufferMinutes ?? 2); const command = useAssistantCommand(name);
  useEffect(() => { if (!pager.focused) command.cancel(); /* cancel PTT on interruption */ }, [pager.focused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!bookmark) return; const timer = setTimeout(() => setBookmark(false), 1800); return () => clearTimeout(timer); }, [bookmark]);
  const flip = () => setFacing(value => value === "back" ? "front" : "back");
  const gesture = Gesture.Pan().activeOffsetY(-28).failOffsetX([-16, 16]).runOnJS(true).onEnd(e => { if (e.translationY < -80) pager.openMemories(); });
  const tap = () => {
    if (pager.session.active) { pager.session.bookmark(); setBookmark(true); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    else if (mode === "session") pager.session.start(); else command.save();
  };
  const building = pager.session.phase === "building";
  return <GestureDetector gesture={gesture}><View style={styles.page}>
    {pager.pageIndex === 1 && <StatusBar style="light" />}<CameraPreview facing={facing} flash={flash} dim={dim && pager.isSessionActive} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <View style={styles.top}><IconButton accessibilityLabel={c.settings} onPress={pager.openSettings} icon={<UserRound accessible={false} size={24} color={colors.foreground} />} style={styles.scrim} /><View style={{ flex: 1, alignItems: "center" }}>{buffer.active || pager.session.active ? <RecordingPill timer={clock(pager.session.active ? pager.session.seconds : buffer.seconds)} /> : <Text variant="caption" style={styles.mediaText}>{c.brand}</Text>}</View><IconButton accessibilityLabel={c.flip} onPress={flip} icon={<SwitchCamera accessible={false} size={24} color={colors.foreground} />} style={styles.scrim} /></View>
      <View style={[styles.scrim, { padding: 12, gap: 4 }]}><Text variant="caption" style={styles.mediaText}>{buffer.active ? copy(c.buffer, { time: clock(buffer.capacity) }) : `${c.bufferPaused} · ${pager.reason ?? c.reasonAway}`}</Text><Text variant="micro" style={{ color: colors.mutedForeground }}>{c.previewOnly}</Text></View>
      <View style={styles.middle}><View style={{ flex: 1 }} /><CameraTools flip={flip} flash={flash} setFlash={() => setFlash(!flash)} location={location} setLocation={() => { setLocation(!location); pager.settings.update({ locationEnabled: !location }); }} paused={pager.privacyPaused} togglePause={() => pager.setPrivacyPaused(!pager.privacyPaused)} session={pager.isSessionActive} /></View>
      <View style={styles.controls}>
        {pager.session.active ? <SessionControls dim={dim} toggleDim={() => setDim(!dim)} /> : building ? <View style={styles.scrim}><Text style={styles.mediaText}>{c.sessionBuilding}</Text></View> : <View style={{ gap: 12, alignItems: "center" }}><Text variant="micro" style={[styles.mediaText, styles.scrim]}>{c.cameraEyebrow}</Text><Text variant="caption" align="center" style={[styles.mediaText, styles.scrim]}>{copy(c.cameraHint, { name })}</Text></View>}
        {!!pager.session.error && <Button label={c.retry} variant="onMedia" onPress={() => { void pager.session.stop(); }} />}
        <CaptureFeedback visible={command.visible} seed={command.data?.savedMemory.frameSeed ?? 11} />
        {(command.listening || command.isPending || command.error || bookmark) && <View accessibilityLiveRegion="polite" style={[styles.scrim, { padding: 12 }]}><Text align="center" style={styles.mediaText}>{bookmark ? c.bookmarked : command.listening ? `${c.listening} · ${command.transcript || c.release}` : command.isPending ? c.saving : c.saveError}</Text>{bookmark && <Flag accessible={false} color={colors.primary} size={24} />}</View>}
        {!pager.session.active && <ModeSwitcher mode={mode} onChange={setMode} disabled={building} />}
        <Shutter label={pager.session.active ? c.bookmark : mode === "session" ? c.sessionStart : c.shutter} disabled={building || command.isPending || !pager.focused || pager.privacyPaused} onTap={tap} onHoldStart={command.start} onHoldEnd={command.release} onHoldCancel={command.cancel} />
        <Button label={c.memories} variant="onMedia" icon={<ChevronUp accessible={false} color={colors.foreground} size={18} />} onPress={pager.openMemories} />
      </View>
    </ScrollView>
  </View></GestureDetector>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingBottom: 12, flexGrow: 1, gap: 12 }, top: { flexDirection: "row", gap: 8, alignItems: "center" }, scrim: { backgroundColor: mediaColors.strongScrim, borderRadius: 10 }, mediaText: { color: colors.foreground }, middle: { flex: 1, minHeight: 208, flexDirection: "row", alignItems: "center" }, controls: { gap: 12, alignItems: "center" } });
