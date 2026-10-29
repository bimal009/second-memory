import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Mic, ArrowLeft, X } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spacing } from "@/theme/spacing";

const LIMIT = 30;
const SIZE = 160;
const RADIUS = 73;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HoldToTalk({ disabled, processing, onSubmit, onHoldingChange, idleLabel = "Hold to talk", processingLabel = "Understanding..." }: {
  disabled: boolean; processing: boolean; onSubmit: (seconds: number) => void; onHoldingChange: (holding: boolean) => void;
  idleLabel?: string; processingLabel?: string;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const active = useRef(false);
  const cancelling = useRef(false);
  const startedAt = useRef(0);
  const startX = useRef(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scale] = useState(() => new Animated.Value(1));
  const finish = useCallback((shouldCancel: boolean) => {
    if (!active.current) return;
    active.current = false;
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    setHolding(false); setCancel(false); onHoldingChange(false);
    if (shouldCancel) { setCancelled(true); return; }
    onSubmit(Math.min(LIMIT, Math.max(1, Math.ceil((Date.now() - startedAt.current) / 1000))));
  }, [onSubmit, onHoldingChange]);
  useEffect(() => {
    Animated.timing(scale, { toValue: holding ? 1.07 : 1, duration: reduced ? 0 : 180, useNativeDriver: true }).start();
  }, [holding, reduced, scale]);
  useEffect(() => {
    if (!cancelled) return;
    const timer = setTimeout(() => setCancelled(false), 2000);
    return () => clearTimeout(timer);
  }, [cancelled]);
  useFocusEffect(useCallback(() => {
    const sub = AppState.addEventListener("change", state => { if (state !== "active") finish(true); });
    return () => { sub.remove(); finish(true); };
  }, [finish]));
  useEffect(() => {
    if (!disabled) return;
    const timer = setTimeout(() => finish(true), 0);
    return () => clearTimeout(timer);
  }, [disabled, finish]);
  const start = (pageX: number) => {
    if (disabled || processing || active.current) return;
    active.current = true; cancelling.current = false; startX.current = pageX; startedAt.current = Date.now();
    setHolding(true); setCancel(false); setElapsed(0); setCancelled(false); onHoldingChange(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    interval.current = setInterval(() => {
      const seconds = Math.min(LIMIT, (Date.now() - startedAt.current) / 1000);
      setElapsed(seconds);
      if (seconds >= LIMIT) finish(cancelling.current);
    }, 50);
  };
  const label = processing ? processingLabel : holding ? cancel ? "Release to cancel" : "Listening..." : idleLabel;
  return <View style={styles.wrap}>
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        accessible accessibilityRole="button" accessibilityLabel={holding ? "Stop voice command" : idleLabel}
        accessibilityHint="Hold to speak. Release to send, or slide left to cancel. Screen reader users can activate to start and activate again to stop."
        accessibilityState={{ disabled: disabled || processing, busy: processing }}
        accessibilityActions={[{ name: "activate", label: holding ? "Stop and send" : "Start listening" }, { name: "escape", label: "Cancel command" }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === "escape") finish(true); else if (event.nativeEvent.actionName === "activate") { if (active.current) finish(false); else start(0); } }}
        onStartShouldSetResponder={() => !disabled && !processing}
        onResponderGrant={event => start(event.nativeEvent.pageX)}
        onResponderMove={event => { if (active.current) { cancelling.current = event.nativeEvent.pageX - startX.current < -65; setCancel(cancelling.current); } }}
        onResponderRelease={() => finish(cancelling.current)}
        onResponderTerminate={() => finish(true)} onResponderTerminationRequest={() => false}
        style={[styles.button, { backgroundColor: cancel ? colors.destructive : colors.primary, opacity: disabled && !processing ? .45 : 1 }]}
      >
        <Svg pointerEvents="none" width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          {holding && <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.primaryForeground} strokeOpacity={.12} strokeWidth={3} fill="none" />}
          {holding && <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={cancel ? colors.destructiveForeground : colors.primaryForeground} strokeWidth={4} fill="none" strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`} strokeDashoffset={CIRCUMFERENCE * (1 - elapsed / LIMIT)} strokeLinecap="round" rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`} />}
        </Svg>
        {processing ? <ActivityIndicator size="large" color={colors.primaryForeground} /> : cancel ? <X size={40} color={colors.destructiveForeground} /> : <Mic size={40} strokeWidth={1.6} color={colors.primaryForeground} />}
        {holding && <Text variant="bodyMedium" style={{ color: cancel ? colors.destructiveForeground : colors.primaryForeground, fontVariant: ["tabular-nums"], marginTop: spacing.sm }}>0:{String(Math.floor(elapsed)).padStart(2, "0")} / 0:30</Text>}
      </View>
    </Animated.View>
    <View style={styles.labels} accessibilityLiveRegion="polite">
      <Text variant="bodyMedium" style={styles.label} color={cancel ? "destructive" : "foreground"}>{label}</Text>
      <View style={styles.hint}>
        {holding && !cancel && <ArrowLeft size={14} color={colors.mutedForeground} />}
        <Text variant="caption" color="mutedForeground" align="center">{processing ? "Putting your memory together" : cancelled ? "Cancelled. Nothing was saved." : holding ? cancel ? "Nothing will be saved" : elapsed >= 25 ? "Need longer? Use Session" : "Slide left to cancel" : "Release to send. Up to 30 seconds."}</Text>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({ wrap: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.md }, button: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, justifyContent: "center", alignItems: "center" }, label: { fontSize: 18, lineHeight: 24 }, labels: { alignItems: "center", gap: spacing.xs, minHeight: 48 }, hint: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 20 } });
