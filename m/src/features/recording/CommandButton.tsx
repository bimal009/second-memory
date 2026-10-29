import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Mic, X } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { useRecordingController, useRecordingState } from "./RecordingProvider";
import { LiveWaveform } from "./LiveWaveform";
import type { CaptureMode } from "./types";

export function CommandButton({ mode, windowSeconds, disabled }: { mode: CaptureMode; windowSeconds: number; disabled?: boolean }) {
  const controller = useRecordingController();
  const state = useRecordingState();
  const { colors } = useTheme();
  const startX = useRef(0);
  const cancelling = useRef(false);
  const pressed = useRef(false);
  const [cancel, setCancel] = useState(false);
  const phase = state?.commandPhase ?? "idle";
  const holding = phase === "recording" || phase === "preparing";
  const processing = phase === "processing";
  const seconds = state?.commandSeconds ?? 0;
  const unavailable = disabled || !controller || !state?.microphoneGranted || processing || phase === "plan";
  const finish = useCallback((discard: boolean) => {
    if (!pressed.current) return;
    pressed.current = false;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void controller?.endCommand(discard).catch(() => {});
    setCancel(false);
  }, [controller]);
  useFocusEffect(useCallback(() => () => finish(true), [finish]));
  const start = (x: number) => {
    if (unavailable || holding) return;
    startX.current = x; cancelling.current = false; pressed.current = true; setCancel(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    void controller?.startCommand(mode, windowSeconds).catch(() => { pressed.current = false; });
  };
  const label = processing ? "Understanding..." : phase === "preparing" ? state?.gettingReady ? "Getting ready..." : "Preparing..." : holding ? cancel ? "Release to cancel" : "Listening..." : "Hold to talk";
  const size = holding ? 172 : 160;
  const radius = 72;
  const circumference = Math.PI * 2 * radius;
  return <View style={{ alignItems: "center", gap: 16 }}>
    {holding && mode === "audio" && <LiveWaveform level={state?.level ?? -160} recording={phase === "recording"} />}
    <View style={{ minHeight: 184, justifyContent: "center", alignItems: "center" }}>
      <View accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: unavailable, busy: processing || phase === "preparing" }} accessibilityHint="Hold to speak, release to send. Slide left to cancel." accessibilityActions={[{ name: "activate", label: holding ? "Stop and send" : "Start recording" }, { name: "escape", label: "Cancel command" }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === "escape") finish(true); else if (event.nativeEvent.actionName === "activate") { if (pressed.current) finish(false); else start(0); } }}
        onStartShouldSetResponder={() => !unavailable}
        onResponderGrant={event => start(event.nativeEvent.pageX)}
        onResponderMove={event => { cancelling.current = event.nativeEvent.pageX - startX.current < -65; setCancel(cancelling.current); }}
        onResponderRelease={() => finish(cancelling.current)} onResponderTerminate={() => finish(true)} onResponderTerminationRequest={() => false}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: cancel ? colors.destructive : colors.primary, opacity: unavailable && !processing ? .45 : 1 }}>
        {holding && <Svg width={160} height={160} style={{ position: "absolute" }} pointerEvents="none"><Circle cx={80} cy={80} r={radius} fill="none" stroke={colors.primaryForeground} strokeOpacity={.15} strokeWidth={3} /><Circle cx={80} cy={80} r={radius} fill="none" stroke={colors.primaryForeground} strokeWidth={4} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - seconds / 30)} rotation={-90} origin="80, 80" /></Svg>}
        {processing || phase === "preparing" ? <ActivityIndicator color={colors.primaryForeground} /> : cancel ? <X size={36} color={colors.destructiveForeground} /> : <Mic size={36} color={colors.primaryForeground} />}
        {phase === "recording" && <Text variant="bodyMedium" style={{ color: colors.primaryForeground, marginTop: 8, fontVariant: ["tabular-nums"] }}>0:{String(Math.floor(seconds)).padStart(2, "0")} / 0:30</Text>}
      </View>
    </View>
    <Text variant="heading" accessibilityLiveRegion="polite">{label}</Text>
    <Text variant="caption" color="mutedForeground" align="center">{holding ? cancel ? "Nothing will be uploaded" : seconds >= 25 ? "Need longer? Use Session" : phase === "preparing" ? "Wait for Listening before speaking" : "Slide left to cancel" : "Release to send. Up to 30 seconds."}</Text>
    <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.secondary }}><Text variant="caption">{mode === "video" ? "Audio + Video" : "Audio only"}</Text></View>
  </View>;
}
