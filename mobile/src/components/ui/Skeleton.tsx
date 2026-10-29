import React, { useEffect } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Placeholder shimmer. Static under reduced motion. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius: r = radius.md,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1100 }),
      -1,
      true,
    );
    return () => {
      progress.value = 0;
    };
  }, [progress, reduced]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.35 * progress.value,
  }));

  return (
    <Animated.View
      accessibilityRole="none"
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: r,
          backgroundColor: colors.muted,
        },
        !reduced && animated,
        style,
      ]}
    />
  );
}
