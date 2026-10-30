import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { darkColors, mediaColors } from "@/theme/tokens";
import { captureCopy as c } from "@/constants/strings";
import type { AssistantCommand } from "@/types/command";
export function IntentPlanChips({ result, visible, location }: { result?: AssistantCommand; visible: boolean; location: boolean }) {
  const reduced = useReducedMotion(); const opacity = useSharedValue(0);
  useEffect(() => { opacity.set(withTiming(visible ? 1 : 0, { duration: reduced ? 0 : 200 })); }, [visible, reduced, opacity]);
  const animation = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: (1 - opacity.value) * 8 }] }));
  if (!result || !visible) return null;
  const labels = result.intent === "bookmark" ? [c.note, ...(location ? [c.location] : [])] : result.intent === "reminder" ? [result.text, result.due] : result.intent === "ask" ? [c.searching] : [result.action === "pause" ? c.paused : result.action === "stop" ? c.endRun : c.capturing];
  return <Animated.View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }, animation]}>{labels.map(label => <View key={label} style={{ backgroundColor: mediaColors.strongScrim, borderRadius: 10, padding: 8 }}><Text variant="caption" style={{ color: darkColors.foreground }}>{label}</Text></View>)}</Animated.View>;
}
