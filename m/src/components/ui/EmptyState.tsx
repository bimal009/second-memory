import React from "react";
import { View, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { limeDeep } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/ThemeProvider";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Icon size={28} color={colors.isDark ? colors.primary : limeDeep} />
      </View>
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      <Text variant="caption" color="mutedForeground" align="center" style={styles.body}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: { textAlign: "center" },
  body: {
    maxWidth: 280,
    marginBottom: spacing.sm,
  },
});
