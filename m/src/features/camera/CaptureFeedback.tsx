import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Check, MapPin, StickyNote, Video } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { GradientFrame } from "@/components/domain/FrameWithHighlight";
import { darkColors, mediaColors } from "@/theme/tokens";
import { uiCopy as c } from "@/constants/strings";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { CapturePlan } from "@/types";
export function CaptureFeedback({ visible, seed, plan }: { visible: boolean; seed: number; plan?: CapturePlan }) {
  const progress = useSharedValue(0); const reduced = useReducedMotion();
  useEffect(() => { progress.value = 0; if (visible) progress.value = withTiming(1, { duration: reduced ? 0 : 300 }); }, [visible, progress, reduced]);
  const toast = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 12 }] }));
  const thumbnail = useAnimatedStyle(() => ({ opacity: 1 - progress.value, transform: [{ translateY: progress.value * 150 }, { scale: 1 - progress.value * 0.7 }] }));
  if (!visible) return null;
  const chips = [{ label: c.planClip, Icon: Video, enabled: plan?.clip }, { label: c.planLocation, Icon: MapPin, enabled: plan?.includeLocation }, { label: c.planNote, Icon: StickyNote, enabled: !!plan?.note }].filter(chip => chip.enabled);
  return <View pointerEvents="none" style={{ gap: 12, alignItems: "center" }}><Animated.View accessibilityLiveRegion="polite" style={[{ backgroundColor: darkColors.primary, padding: 12, borderRadius: 10, flexDirection: "row", gap: 8 }, toast]}><Check accessible={false} size={18} color={darkColors.primaryForeground} /><Text variant="caption" style={{ color: darkColors.primaryForeground }}>{c.saved}</Text></Animated.View><View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>{chips.map(({ label, Icon }) => <View key={label} style={{ flexDirection: "row", gap: 4, padding: 8, borderRadius: 10, backgroundColor: mediaColors.strongScrim }}><Icon accessible={false} size={18} color={darkColors.foreground} /><Text variant="caption" style={{ color: darkColors.foreground }}>{label}</Text></View>)}</View><Animated.View style={[{ position: "absolute", width: 48, height: 48 }, thumbnail]}><GradientFrame seed={seed} /></Animated.View></View>;
}
