import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Lock } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { RecordingPill } from "@/components/domain/RecordingPill";
import { radius } from "@/theme/tokens";
import { spacing, touchTarget } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { strings } from "@/constants/strings";

export type RecordingBannerProps = {
  visible: boolean;
  paused: boolean;
  timer: string;
  onPause: () => void;
  onResume: () => void;
};

/**
 * Global, always-visible indicator that capture is running.
 * Rendered from the root layout, above every screen and tab bar.
 */
export function RecordingBanner({
  visible,
  paused,
  timer,
  onPause,
  onResume,
}: RecordingBannerProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { backgroundColor: colors.primary }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${strings.recordingBanner.label} ${timer}`}
    >
      <View style={styles.row}>
        <Lock size={14} color={colors.primaryForeground} />
        {paused ? (
          <Text variant="micro" style={{ color: colors.primaryForeground }}>
            {strings.capture.paused} · {timer}
          </Text>
        ) : (
          <RecordingPill timer={timer} paused={false} />
        )}
        <View style={styles.grow} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? strings.recordingBanner.resume : strings.recordingBanner.pause}
          onPress={paused ? onResume : onPause}
          style={({ pressed }) => [
            styles.action,
            { borderColor: colors.primaryForeground },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text variant="micro" style={{ color: colors.primaryForeground }}>
            {paused ? strings.recordingBanner.resume : strings.recordingBanner.pause}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.base,
    padding: spacing.xs,
    borderCurve: "continuous",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: touchTarget - 8,
  },
  grow: { flex: 1 },
  action: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget - 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
