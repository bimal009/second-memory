import React, { useEffect } from "react";
import { Flag } from "lucide-react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { darkColors } from "@/theme/tokens";
export function BookmarkFeedback() {
  const reduced = useReducedMotion(); const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => { progress.set(withTiming(1, { duration: reduced ? 0 : 200 })); }, [progress, reduced]);
  const animation = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 12 }] }));
  return <Animated.View style={animation}><Flag accessible={false} color={darkColors.foreground} size={24} /></Animated.View>;
}
