import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Mic } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { darkColors } from "@/theme/tokens";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { uiCopy as c } from "@/constants/strings";
type Props = { onTap: () => void; onHoldStart: () => void; onHoldEnd: () => void; onHoldCancel?: () => void; disabled?: boolean; label?: string };
export function Shutter({ onTap, onHoldStart, onHoldEnd, onHoldCancel, disabled, label = c.shutter }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const start = useRef(0); const held = useRef(false);
  const [holding, setHolding] = useState(false); const scale = useSharedValue(1); const reduced = useReducedMotion();
  const animation = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (disabled) { if (timer.current) clearTimeout(timer.current); if (held.current) onHoldCancel?.(); held.current = false; scale.set(1); } }, [disabled, onHoldCancel, scale]);
  return <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={c.tapHoldHint} accessibilityState={{ disabled }}
    onPressIn={() => { start.current = Date.now(); held.current = false; void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); scale.set(withTiming(0.92, { duration: reduced ? 0 : 150 })); timer.current = setTimeout(() => { held.current = true; setHolding(true); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onHoldStart(); }, 350); }}
    onPressOut={() => { if (timer.current) clearTimeout(timer.current); scale.set(withTiming(1, { duration: reduced ? 0 : 200 })); const elapsed = Date.now() - start.current; if (!disabled) { if (held.current) { onHoldEnd(); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } else if (elapsed < 180) onTap(); } held.current = false; setHolding(false); }}
    style={({ pressed }) => [styles.ring, { borderColor: darkColors.primary, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }]}>
    <Animated.View style={[styles.core, { backgroundColor: holding && !disabled ? darkColors.primary : darkColors.foreground }, animation]}>{holding && !disabled ? <Mic size={32} color={darkColors.primaryForeground} accessible={false} /> : <View style={[styles.dot, { backgroundColor: darkColors.primary }]} />}</Animated.View>
  </Pressable>;
}
const styles = StyleSheet.create({ ring: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, padding: 6, alignItems: "center", justifyContent: "center" }, core: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" }, dot: { width: 12, height: 12, borderRadius: 6 } });
