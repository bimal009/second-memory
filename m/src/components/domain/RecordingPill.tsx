import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { captureCopy, strings } from "@/constants/strings";

export type RecordingPillProps = {
  /** MM:SS elapsed. */
  timer: string;
  paused?: boolean;
};

/** Pulsing "Recording" pill shown at the top of capture + RecordingBanner. */
export function RecordingPill({ timer, paused }: RecordingPillProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced || paused) return;
    pulse.value = withRepeat(withTiming(0.35, { duration: 300 }), -1, true);
    return () => {
      pulse.value = withTiming(1, { duration: 100 });
    };
  }, [pulse, reduced, paused]);

  const animated = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 1 + (1 - pulse.value) * 0.35 }],
  }));

  const label = paused ? strings.capture.paused : captureCopy.capturing;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${label} ${timer}`}
      style={[
        styles.pill,
        { backgroundColor: colors.primary },
      ]}
    >
      <Animated.View style={[styles.dot, { backgroundColor: colors.destructive }, animated]} />
      <Text variant="micro" style={{ color: colors.primaryForeground }}>
        {label} · {timer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
