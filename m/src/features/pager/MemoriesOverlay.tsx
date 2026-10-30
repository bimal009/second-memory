import React, { useEffect } from "react";
import { BackHandler, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/theme/ThemeProvider";
import { MemoryLibrary } from "@/features/memories/MemoryLibrary";
import { useAppPager } from "./AppPagerProvider";
export function MemoriesOverlay() {
  const { closeOverlay, routeFocused } = useAppPager(); const { height } = useWindowDimensions(); const { colors } = useTheme(); const reduced = useReducedMotion();
  const offset = useSharedValue(height);
  useEffect(() => { offset.value = withTiming(0, { duration: reduced ? 0 : 300 }); }, [height, offset, reduced]);
  useEffect(() => { if (!routeFocused) return; const sub = BackHandler.addEventListener("hardwareBackPress", () => { closeOverlay(); return true; }); return () => sub.remove(); }, [closeOverlay, routeFocused]);
  const dismiss = () => { offset.set(withTiming(height, { duration: reduced ? 0 : 250 })); setTimeout(closeOverlay, reduced ? 0 : 250); };
  const gesture = Gesture.Pan().activeOffsetY(18).failOffsetX([-20, 20]).runOnJS(true).onUpdate(e => { offset.set(Math.max(0, e.translationY)); }).onEnd(e => { if (e.translationY > 100 || e.velocityY > 800) dismiss(); else offset.set(withTiming(0, { duration: reduced ? 0 : 200 })); });
  const animation = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  return <Animated.View accessibilityViewIsModal onAccessibilityEscape={dismiss} style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, animation]}><GestureDetector gesture={gesture}><View style={{ height: 40, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ring }} /></View></GestureDetector><MemoryLibrary onClose={dismiss} /></Animated.View>;
}
