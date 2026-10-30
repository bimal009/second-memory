import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SwitchCamera, UserRound, MessageSquare, Flag } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Shutter } from "@/components/domain/Shutter";
import { RecordingPill } from "@/components/domain/RecordingPill";
import { CaptureStatus } from "@/components/domain/CaptureStatus";
import { IntentPlanChips } from "@/components/domain/IntentPlanChips";
import { AnswerOverlay } from "@/components/domain/AnswerOverlay";
import { useAppPager } from "@/features/pager/AppPagerProvider";
import { useCapture } from "@/features/run/CaptureProvider";
import { clock } from "@/features/session/clock";
import { captureCopy as c, uiCopy as u } from "@/constants/strings";
import { darkColors as colors, mediaColors } from "@/theme/tokens";
import { CameraTools } from "./CameraTools";
import { PreviewFallback } from "./PreviewFallback";
import { CommandComposer } from "./CommandComposer";
import { useAssistantCommand } from "./useAssistantCommand";
export function CameraPage() {
  const pager = useAppPager(); const capture = useCapture(); const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false); const [composer, setComposer] = useState(false); const [saved, setSaved] = useState(false); const [dismissed, setDismissed] = useState<unknown>(null);
  const name = capture.settings.data?.assistantName.trim() || u.fallbackName;
  const stop = () => { if (capture.elapsed < 10) setConfirm(true); else void capture.stop(); };
  const command = useAssistantCommand(name, stop); const active = capture.status === "capturing"; const idle = capture.status === "idle";
  useEffect(() => { if (!pager.focused || !capture.foreground) command.cancel(); }, [pager.focused, capture.foreground]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!saved) return; const timer = setTimeout(() => setSaved(false), 1800); return () => clearTimeout(timer); }, [saved]);
  const answer = dismissed !== command.data && command.data?.intent === "ask" ? command.data : null;
  const gesture = Gesture.Pan().enabled(!answer && !composer).activeOffsetY(-28).failOffsetX([-16, 16]).runOnJS(true).onEnd(e => { if (e.translationY < -80) pager.openMemories(); });
  const tap = () => { if (idle) void capture.start(); else if (!active) capture.resume(); else void capture.bookmark().then(() => { setSaved(true); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }); };
  const caption = command.listening ? command.transcript || c.listening : command.isPending ? c.thinking : command.error ? c.commandError : saved ? c.saved : command.visible ? command.data?.intent === "reminder" ? c.reminderSaved : command.data?.intent === "bookmark" ? c.saved : "" : "";
  return <GestureDetector gesture={gesture}><View style={styles.page}>
    {pager.pageIndex === 1 && <StatusBar style="light" />}
    <ScrollView accessibilityElementsHidden={!!answer} importantForAccessibility={answer ? "no-hide-descendants" : "auto"} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.top}><IconButton accessibilityLabel={u.settings} onPress={pager.openSettings} icon={<UserRound accessible={false} size={24} color={colors.foreground} />} style={styles.scrim} /><View style={{ flex: 1 }}>{active ? <RecordingPill timer={clock(capture.elapsed)} /> : <Text align="center" variant="caption" style={[styles.text, styles.scrim]}>{c.previewOnly}</Text>}</View><IconButton accessibilityLabel={u.flip} onPress={capture.flip} icon={<SwitchCamera accessible={false} size={24} color={colors.foreground} />} style={styles.scrim} /></View>
      <View style={[styles.scrim, { padding: 12, alignItems: "center", gap: 4 }]}><Text variant="heading" style={styles.text}>{name}</Text><Text variant="caption" style={styles.text}>{command.listening ? c.listening : command.isPending ? c.thinking : active ? c.watching : c.ready}</Text>{active && <Text variant="caption" style={styles.text}>{c.previewOnly}</Text>}</View>
      <CaptureStatus />
      <View style={styles.middle}><PreviewFallback /><CameraTools /></View>
      <View style={styles.controls}>
        {!!caption && <View accessibilityLiveRegion="polite" style={[styles.scrim, { padding: 12, flexDirection: "row", gap: 8 }]}>{saved && <Flag accessible={false} color={colors.foreground} size={24} />}<Text align="center" style={styles.text}>{caption}</Text></View>}
        <IntentPlanChips visible={command.visible} result={command.data} location={capture.settings.data?.locationEnabled ?? true} />
        {active && capture.elapsed < 8 && <Text variant="caption" style={[styles.text, styles.scrim]}>{c.consent}</Text>}
        {capture.warning && !idle && <Text variant="caption" style={[styles.text, styles.scrim]}>{c.warning}</Text>}
        {idle && capture.limit && <Text variant="caption" style={[styles.text, styles.scrim]}>{c.limit}</Text>}
        <Text variant="caption" style={[styles.text, styles.scrim]}>{capture.busy ? c.finishing : idle ? c.startHint : active ? c.bookmarkHint : c.resume}</Text>
        <View style={styles.top}><IconButton accessibilityLabel={c.commandLabel} onPress={() => setComposer(true)} icon={<MessageSquare accessible={false} size={24} color={colors.foreground} />} style={styles.scrim} /><Shutter label={idle ? c.start : c.rememberThis} disabled={capture.busy || command.isPending || !pager.focused || !capture.foreground || capture.settings.isPending} onTap={tap} onHoldStart={command.start} onHoldEnd={command.release} onHoldCancel={command.cancel} />{!idle ? <Button label={c.stop} variant="onMedia" onPress={stop} /> : <View style={{ width: 48 }} />}</View>
        {active && <Text variant="caption" style={[styles.text, styles.scrim]}>{c.keepAwake}</Text>}
      </View>
    </ScrollView>
    {answer && <AnswerOverlay result={answer.result} onClose={() => setDismissed(command.data)} onOpen={() => { setDismissed(command.data); pager.goTo(0); router.setParams({ question: answer.question }); }} />}
    {composer && <CommandComposer close={() => setComposer(false)} send={command.send} />}
    <BottomSheet visible={confirm} title={c.stopTitle} onClose={() => setConfirm(false)}><Text>{c.stopBody}</Text><Button label={c.endRun} onPress={() => { setConfirm(false); void capture.stop(); }} /><Button label={u.cancel} variant="secondary" onPress={() => setConfirm(false)} /></BottomSheet>
  </View></GestureDetector>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, content: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1, gap: 12 }, top: { flexDirection: "row", gap: 16, alignItems: "center", justifyContent: "center" }, scrim: { backgroundColor: mediaColors.strongScrim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, text: { color: colors.foreground }, middle: { flex: 1, minHeight: 272, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }, controls: { gap: 12, alignItems: "center" } });
