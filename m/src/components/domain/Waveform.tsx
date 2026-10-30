import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { darkColors } from "@/theme/tokens";
import { useReducedMotion } from "@/hooks/useReducedMotion";
function Bar({ index, active }: { index: number; active: boolean }) {
  const scale = useSharedValue(0.25); const reduced = useReducedMotion();
  useEffect(() => { scale.value = active && !reduced ? withRepeat(withTiming(1, { duration: 300 + (index % 5) * 90 }), -1, true) : 0.5; }, [active, reduced, index, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return <Animated.View style={[{ height: 24 + (index * 7 % 24), width: 3, borderRadius: 2, backgroundColor: darkColors.primary }, style]} />;
}
export function Waveform({ active = true }: { active?: boolean }) { return <View accessible={false} style={{ height: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>{Array.from({ length: 24 }, (_, i) => <Bar key={i} index={i} active={active} />)}</View>; }
