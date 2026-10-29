import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";

export type BadgeProps = {
  label: string;
  tone?: "neutral" | "lime" | "danger" | "outline";
};

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  const { colors } = useTheme();

  const palette: Record<NonNullable<BadgeProps["tone"]>, { bg: string; fg: string; border?: string }> = {
    neutral: { bg: colors.muted, fg: colors.mutedForeground },
    lime: { bg: colors.primary, fg: colors.primaryForeground },
    danger: { bg: "transparent", fg: colors.destructive, border: colors.destructive },
    outline: { bg: "transparent", fg: colors.mutedForeground, border: colors.border },
  };
  const p = palette[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? "transparent",
        },
      ]}
    >
      <Text variant="micro" style={{ color: p.fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});
