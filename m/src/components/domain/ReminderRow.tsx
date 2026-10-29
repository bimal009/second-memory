import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CheckCircle2, Circle } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import type { Reminder } from "@/types";
import { limeDeep } from "@/theme/tokens";
import { spacing, touchTarget } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { useHaptics } from "@/hooks/useHaptics";

export type ReminderRowProps = {
  reminder: Reminder;
  onToggle: (done: boolean) => void;
};

export function ReminderRow({ reminder, onToggle }: ReminderRowProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const icon = reminder.done ? (
    <CheckCircle2 size={22} color={colors.isDark ? colors.primary : limeDeep} />
  ) : (
    <Circle size={22} color={colors.ring} />
  );

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={reminder.text}
      accessibilityState={{ checked: reminder.done }}
      accessibilityHint="Toggle done"
      onPress={() => {
        haptics.light();
        onToggle(!reminder.done);
      }}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.body}>
        <Text
          variant="body"
          color={reminder.done ? "mutedForeground" : "foreground"}
          style={reminder.done ? styles.done : undefined}
        >
          {reminder.text}
        </Text>
      </View>
      <Text variant="micro" color="mutedForeground" style={styles.time}>
        {reminder.timeLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: touchTarget,
    paddingVertical: spacing.sm,
  },
  icon: { width: 28, alignItems: "center" },
  body: { flex: 1 },
  done: { textDecorationLine: "line-through" },
  time: { textAlign: "right" },
});
